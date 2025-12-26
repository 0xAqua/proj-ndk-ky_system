import os
import json
import boto3
import secrets
import time
import base64
import hashlib
from datetime import datetime, timezone
from typing import Dict, Optional
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

# Powertoolsの初期化
logger = Logger()
tracer = Tracer()

# AWS クライアント
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
kms = boto3.client('kms')

# 環境変数
USER_POOL_ID = os.environ['USER_POOL_ID']
CLIENT_ID = os.environ['CLIENT_ID']
SESSION_TABLE = os.environ['SESSION_TABLE']
TENANT_USER_MASTER_TABLE = os.environ['TENANT_USER_MASTER_TABLE']
TENANT_CONFIG_TABLE = os.environ['TENANT_CONFIG_TABLE']  # 追加
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '').split(',')
COOKIE_SAME_SITE = os.environ.get('COOKIE_SAME_SITE', 'Lax')
SESSION_TTL_SECONDS = int(os.environ.get('SESSION_TTL_SECONDS', '3600'))
KMS_KEY_ID = os.environ['KMS_KEY_ID']
PENDING_AUTH_TTL_SECONDS = int(os.environ.get('PENDING_AUTH_TTL_SECONDS', '300'))  # 5分
ACCESS_HISTORY_TABLE = os.environ.get('ACCESS_HISTORY_TABLE')

# DynamoDBテーブル
session_table = dynamodb.Table(SESSION_TABLE)
user_master_table = dynamodb.Table(TENANT_USER_MASTER_TABLE)
tenant_config_table = dynamodb.Table(TENANT_CONFIG_TABLE)
access_history_table = dynamodb.Table(ACCESS_HISTORY_TABLE)
MAX_SESSION_DURATION = 3 * 60 * 60  # 3時間


# ============================================
# 共通ユーティリティ
# ============================================
# ─────────────────────────────
# 追加: アクセスログ保存用関数
# ─────────────────────────────
def save_access_log(email: str, ip_address: str, tenant_id: str = 'UNKNOWN',
                    user_sub: str = None, user_agent: str = '',
                    event_type: str = 'Login', result: str = 'Success',
                    detail: str = None):
    """DynamoDBにアクセス履歴を保存（失敗してもメイン処理は止めない）"""
    try:
        timestamp = int(time.time())
        # ソートキーを一意にするためのランダム値
        event_id = secrets.token_hex(8)

        item = {
            'tenant_id': tenant_id,
            'timestamp_event_id': f"{timestamp}#{event_id}",
            'email': email,
            'event_type': event_type,
            'result': result,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': timestamp,
            'expires_at': timestamp + (90 * 24 * 60 * 60) # 90日保存
        }

        if user_sub:
            item['user_sub'] = user_sub
        if detail:
            item['detail'] = detail # エラー内容など

        access_history_table.put_item(Item=item)

    except Exception as e:
        # ログ保存のエラーはログに出すだけで、ログイン処理自体は続行させる
        logger.error(f"Failed to save access log: {e}")

def encrypt_token(token: str) -> str:
    """KMSでトークンを暗号化"""
    resp = kms.encrypt(KeyId=KMS_KEY_ID, Plaintext=token.encode())
    return base64.b64encode(resp['CiphertextBlob']).decode()


def decrypt_token(encrypted: str) -> str:
    """KMSでトークンを復号"""
    blob = base64.b64decode(encrypted)
    resp = kms.decrypt(CiphertextBlob=blob)
    return resp['Plaintext'].decode()


def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化（DynamoDB保存用）"""
    return hashlib.sha256(session_id.encode()).hexdigest()


def create_response(status_code: int, body: dict, cors_headers: dict) -> dict:
    """標準レスポンス生成"""
    return {
        'statusCode': status_code,
        'headers': {
            **cors_headers,
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
        },
        'body': json.dumps(body, ensure_ascii=False)
    }


def get_cors_headers(origin: str) -> Dict[str, str]:
    """CORS用ヘッダー取得"""
    headers = {
        'Content-Type': 'application/json',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
    if origin and origin in ALLOWED_ORIGINS:
        headers.update({
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
        })
    return headers


def parse_cookies(event: dict) -> dict:
    """API Gateway v2 の cookies リストをパース"""
    raw_cookies = event.get('cookies', [])
    cookies = {}
    for c in raw_cookies:
        if '=' in c:
            k, v = c.split('=', 1)
            cookies[k.strip()] = v.strip()
    return cookies


def decode_id_token(id_token: str) -> Dict:
    """IDトークンのペイロードをデコード"""
    try:
        payload = id_token.split('.')[1]
        payload += '=' * (4 - len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception as e:
        logger.warning(f"Failed to decode ID token: {e}")
        return {}


def generate_session_id() -> str:
    """暗号学的に安全なセッションID生成（256ビット）"""
    return secrets.token_urlsafe(32)


def build_cookie(name: str, value: str, max_age: int) -> str:
    """セキュアなCookie文字列を生成"""
    cookie_parts = [
        f"{name}={value}",
        "HttpOnly",
        "Secure",
        f"SameSite={COOKIE_SAME_SITE}",
        "Path=/",
        f"Max-Age={max_age}"
    ]
    return "; ".join(cookie_parts)


def mask_email(email: str) -> str:
    """メールアドレスをマスク（例: t***@example.com）"""
    if "@" not in email:
        return "***"
    local, domain = email.split("@")
    if len(local) <= 1:
        masked_local = "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 1)
    return f"{masked_local}@{domain}"


# ============================================
# テナント設定
# ============================================

def get_tenant_security_config(tenant_id: str) -> Dict:
    try:
        resp = tenant_config_table.get_item(Key={'tenant_id': tenant_id})
        item = resp.get('Item', {})
        return item.get('security_config', {
            'otp_enabled': False,
            'passkey_enabled': False
        })
    except Exception as e:
        # エラーの詳細をログに出す
        logger.error(f"DETAILED ERROR: {str(e)}")
        return {'otp_enabled': False, 'passkey_enabled': False}


# ============================================
# Pending Auth（OTP待ち状態の一時保存）
# ============================================

def save_pending_auth(tenant_id: str, email: str, cognito_session: str, user_info: Dict) -> str:
    """
    OTP検証待ちの状態を一時保存
    セッションテーブルにpending_プレフィックスで保存
    """
    pending_key = generate_session_id()
    hashed_key = hash_session_id(f"pending_{pending_key}")
    current_time = int(time.time())
    expires_at = current_time + PENDING_AUTH_TTL_SECONDS

    session_table.put_item(Item={
        'session_id': hashed_key,
        'type': 'pending_auth',
        'tenant_id': tenant_id,
        'email': email,
        'cognito_session': encrypt_token(cognito_session),
        'user_info': json.dumps(user_info),
        'expires_at': expires_at,
        'created_at': current_time,
        'ttl': expires_at + 3600,
    })

    logger.info("Pending auth saved", email=mask_email(email))
    return pending_key


def get_pending_auth(pending_key: str) -> Optional[Dict]:
    """OTP検証待ちの状態を取得"""
    hashed_key = hash_session_id(f"pending_{pending_key}")

    try:
        resp = session_table.get_item(Key={'session_id': hashed_key})
        item = resp.get('Item')

        if not item:
            return None

        if item.get('type') != 'pending_auth':
            return None

        if item.get('expires_at', 0) < int(time.time()):
            # 期限切れ → 削除
            session_table.delete_item(Key={'session_id': hashed_key})
            return None

        return {
            'tenant_id': item.get('tenant_id'),
            'email': item.get('email'),
            'cognito_session': decrypt_token(item.get('cognito_session')),
            'user_info': json.loads(item.get('user_info', '{}')),
        }
    except Exception:
        logger.exception("Failed to get pending auth")
        return None


def delete_pending_auth(pending_key: str) -> None:
    """OTP検証待ちの状態を削除"""
    hashed_key = hash_session_id(f"pending_{pending_key}")
    try:
        session_table.delete_item(Key={'session_id': hashed_key})
    except Exception:
        logger.exception("Failed to delete pending auth")


# ============================================
# メインハンドラー
# ============================================

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext):
    method = event.get('requestContext', {}).get('http', {}).get('method', '')
    path = event.get('rawPath', '')
    headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
    origin = headers.get('origin', '')
    cors_headers = get_cors_headers(origin)

    if method == 'OPTIONS':
        return handle_preflight(cors_headers)

    # CSRFチェック
    if headers.get('x-requested-with', '').lower() != 'xmlhttprequest':
        logger.warning("CSRF check failed: missing X-Requested-With header")
        return create_response(403, {'error': 'Forbidden'}, cors_headers)

    # ルーティング
    if path == '/bff/auth/login' and method == 'POST':
        return handle_login(event, cors_headers)
    elif path == '/bff/auth/verify-otp' and method == 'POST':
        return handle_verify_otp(event, cors_headers)
    elif path == '/bff/auth/resend-otp' and method == 'POST':
        return handle_resend_otp(event, cors_headers)
        # ★ Passkey 認証（ログイン）用パスを追加
    elif path == '/bff/auth/passkey/options' and method == 'POST':
        return handle_passkey_options(event, cors_headers)
    elif path == '/bff/auth/passkey/verify' and method == 'POST':
        return handle_passkey_verify(event, cors_headers)
        # ★ Passkey 登録（ログイン後）用パスを追加
    elif path == '/bff/auth/passkey/register-options' and method == 'POST':
        return handle_passkey_register_options(event, cors_headers)
    elif path == '/bff/auth/passkey/register-verify' and method == 'POST':
        return handle_passkey_register_verify(event, cors_headers)
        # 既存のパス
    elif path == '/bff/auth/session' and method == 'GET':
        return handle_session_check(event, cors_headers)
    elif path == '/bff/auth/logout' and method == 'POST':
        return handle_logout(event, cors_headers)
    elif path == '/bff/auth/refresh' and method == 'POST':
        return handle_refresh(event, cors_headers)
    # パスワードリセット
    elif path == '/bff/auth/forgot-password' and method == 'POST':
        return handle_forgot_password(event, cors_headers)
    elif path == '/bff/auth/reset-password' and method == 'POST':
        return handle_reset_password(event, cors_headers)

    return create_response(404, {'error': 'Not found'}, cors_headers)

# ============================================
# Passkey 認証アクション (Login)
# ============================================
def handle_passkey_verify(event: dict, cors_headers: dict) -> dict:
    """Passkey認証の検証（ログイン完了）"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username')
        credential = body.get('credential')
        encrypted_session = body.get('cognito_session')

        if not username or not credential or not encrypted_session:
            return create_response(400, {'error': 'Missing parameters'}, cors_headers)

        # Cognitoのセッションを復号
        cognito_session = decrypt_token(encrypted_session)

        # Cognitoにチャレンジ応答を送信
        resp = cognito.admin_respond_to_auth_challenge(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            ChallengeName='WEB_AUTHN',
            Session=cognito_session,
            ChallengeResponses={
                'USERNAME': username,
                'CREDENTIAL': json.dumps(credential)
            }
        )

        # 認証成功
        if 'AuthenticationResult' not in resp:
            return create_response(401, {'error': 'AuthFailed'}, cors_headers)

        tokens = resp['AuthenticationResult']
        user_info = decode_id_token(tokens['IdToken'])

        # セッション発行（OTPと同じ処理）
        return create_session_and_response(tokens, user_info, event, cors_headers)

    except Exception:
        logger.exception("Passkey verify error")
        return create_response(401, {'error': 'PasskeyAuthFailed'}, cors_headers)

def handle_passkey_options(event: dict, cors_headers: dict) -> dict:
    """Passkey認証用のチャレンジ(Options)を取得"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()

        if not username:
            return create_response(400, {'error': 'Username is required'}, cors_headers)

        resp = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='USER_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PREFERRED_CHALLENGE': 'WEB_AUTHN'
            }
        )

        logger.info(f"Cognito passkey response", extra={
            "challenge_name": resp.get('ChallengeName'),
            "available_challenges": resp.get('AvailableChallenges'),
            "challenge_parameters": resp.get('ChallengeParameters')
        })

        # ★ WEB_AUTHN に修正
        if resp.get('ChallengeName') != 'WEB_AUTHN':
            return create_response(400, {'error': 'PasskeyNotSupported'}, cors_headers)

        # チャレンジとセッションを返す
        return create_response(200, {
            'public_challenge': resp['ChallengeParameters'],
            'cognito_session': encrypt_token(resp['Session'])
        }, cors_headers)

    except Exception:
        logger.exception("Failed to get passkey options")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)

def handle_passkey_register_options(event: dict, cors_headers: dict) -> dict:
    """Passkey登録用のチャレンジを取得 (要ログイン)"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if not session_id:
        return create_response(401, {'error': 'Unauthorized'}, cors_headers)

    hashed_id = hash_session_id(session_id)
    try:
        resp = session_table.get_item(Key={'session_id': hashed_id})
        session = resp.get('Item')

        if not session or session.get('expires_at', 0) < int(time.time()):
            return create_response(401, {'error': 'SessionExpired'}, cors_headers)

        tenant_id = session.get('tenant_id')
        email = session.get('email')
        logger.append_keys(tenant_id=tenant_id, email=mask_email(email))

        access_token = decrypt_token(session.get('access_token'))

        # Cognitoから登録用オプションを取得
        register_resp = cognito.start_web_authn_registration(
            AccessToken=access_token
        )

        logger.info("Passkey register options retrieved successfully")

        return create_response(200, {
            'status': 'success',
            'creation_options': register_resp['CredentialCreationOptions']
        }, cors_headers)

    except Exception:
        logger.exception("Register options error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)


def handle_passkey_register_verify(event: dict, cors_headers: dict) -> dict:
    """Passkeyの登録を確定させる (要ログイン)"""
    try:
        body = json.loads(event.get('body', '{}'))
        credential = body.get('credential')

        if not credential:
            return create_response(400, {'error': 'Credential is required'}, cors_headers)

        cookies = parse_cookies(event)
        session_id = cookies.get('sessionId')

        if not session_id:
            return create_response(401, {'error': 'Unauthorized'}, cors_headers)

        hashed_id = hash_session_id(session_id)
        resp = session_table.get_item(Key={'session_id': hashed_id})
        session_data = resp.get('Item')

        if not session_data or session_data.get('expires_at', 0) < int(time.time()):
            return create_response(401, {'error': 'SessionExpired'}, cors_headers)

        access_token = decrypt_token(session_data.get('access_token'))

        cognito.complete_web_authn_registration(
            AccessToken=access_token,
            Credential=credential
        )

        # ★ セッションの has_passkey を更新
        session_table.update_item(
            Key={'session_id': hashed_id},
            UpdateExpression='SET has_passkey = :val',
            ExpressionAttributeValues={':val': True}
        )

        logger.info("Passkey registration completed successfully")
        return create_response(200, {'success': True}, cors_headers)

    except Exception:
        logger.exception("Register verification error")
        return create_response(400, {'error': 'PasskeyRegistrationFailed'}, cors_headers)


def handle_preflight(cors_headers: dict) -> dict:
    """OPTIONSプリフライトリクエスト処理"""
    return {
        'statusCode': 204,
        'headers': {
            **cors_headers,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
            'Access-Control-Max-Age': '86400',
        },
        'body': ''
    }


# ============================================
# 認証アクション
# ============================================

def handle_login(event: dict, cors_headers: dict) -> dict:
    """ログイン処理: パスワード検証 → OTP要否判定 → セッション or OTPチャレンジ"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()
        password = body.get('password', '')

        http_ctx = event.get('requestContext', {}).get('http', {})
        source_ip = http_ctx.get('sourceIp', 'unknown')
        user_agent = http_ctx.get('userAgent', '')

        if not username or not password:
            return create_response(400, {'error': '入力が不足しています'}, cors_headers)

        # ──────────────────────────────────────────────────────────
        # 1. パスワード検証（ADMIN_USER_PASSWORD_AUTH）
        # ──────────────────────────────────────────────────────────
        try:
            auth_resp = cognito.admin_initiate_auth(
                UserPoolId=USER_POOL_ID,
                ClientId=CLIENT_ID,
                AuthFlow='ADMIN_USER_PASSWORD_AUTH',
                AuthParameters={'USERNAME': username, 'PASSWORD': password}
            )
        except Exception as e:
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', str(e))

            save_access_log(
                email=username, # ログインしようとしたメアド
                ip_address=source_ip,
                user_agent=user_agent,
                tenant_id='UNKNOWN', # 失敗時はテナント不明
                event_type='Login',
                result='Failure',
                detail=error_code
            )
            return handle_cognito_error(e, cors_headers)

        # ChallengeName がある場合（NEW_PASSWORD_REQUIREDなど）
        if 'ChallengeName' in auth_resp:
            challenge = auth_resp['ChallengeName']
            if challenge == 'NEW_PASSWORD_REQUIRED':
                return create_response(401, {'error': 'NewPasswordRequired'}, cors_headers)
            return create_response(401, {'error': challenge}, cors_headers)

        # 認証成功
        tokens = auth_resp['AuthenticationResult']
        user_info = decode_id_token(tokens['IdToken'])
        email = user_info.get('email', '')
        tenant_id = user_info.get('custom:tenant_id', 'UNKNOWN')

        logger.append_keys(tenant_id=tenant_id, email=mask_email(email))
        logger.info("Password verification successful", action_category="AUTH")

        # ──────────────────────────────────────────────────────────
        # 2. テナントのセキュリティ設定を確認
        # ──────────────────────────────────────────────────────────
        security_config = get_tenant_security_config(tenant_id)
        otp_enabled = security_config.get('otp_enabled', False)
        passkey_enabled = security_config.get('passkey_enabled', False)

        logger.info(f"OTP enabled: {otp_enabled}", action_category="AUTH")

        # ──────────────────────────────────────────────────────────
        # 3-A. OTP無効 → 従来通りセッション発行
        # ──────────────────────────────────────────────────────────
        if not otp_enabled:
            return create_session_and_response(tokens, user_info, event, cors_headers)

        # ──────────────────────────────────────────────────────────
        # 3-B. OTP有効 → CUSTOM_AUTHでOTPチャレンジ開始
        # ──────────────────────────────────────────────────────────
        try:
            custom_resp = cognito.admin_initiate_auth(
                UserPoolId=USER_POOL_ID,
                ClientId=CLIENT_ID,
                AuthFlow='CUSTOM_AUTH',
                AuthParameters={'USERNAME': username}
            )
        except Exception as e:
            logger.exception("CUSTOM_AUTH initiation failed")
            return create_response(500, {'error': 'OTPInitFailed'}, cors_headers)

        cognito_session = custom_resp.get('Session')
        if not cognito_session:
            logger.error("No session returned from CUSTOM_AUTH")
            return create_response(500, {'error': 'OTPInitFailed'}, cors_headers)

        # Pending Authを保存
        pending_key = save_pending_auth(tenant_id, email, cognito_session, user_info)

        # publicChallengeParameters からマスクメールを取得（あれば）
        challenge_params = custom_resp.get('ChallengeParameters', {})
        masked_email = challenge_params.get('maskedEmail', mask_email(email))

        return create_response(200, {
            'otp_required': otp_enabled,
            'passkey_required': passkey_enabled,
            'pending_key': pending_key,
            'masked_email': masked_email
        }, cors_headers)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'InvalidJSONFormat'}, cors_headers)
    except Exception:
        logger.exception("Login error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)


def handle_verify_otp(event: dict, cors_headers: dict) -> dict:
    """OTP検証: チャレンジ応答 → セッション発行"""
    try:
        body = json.loads(event.get('body', '{}'))
        pending_key = body.get('pending_key', '').strip()
        otp_code = body.get('otp_code', '').strip()
        http_ctx = event.get('requestContext', {}).get('http', {})
        source_ip = http_ctx.get('sourceIp', 'unknown')
        user_agent = http_ctx.get('userAgent', '')

        if not pending_key or not otp_code:
            return create_response(400, {'error': '入力が不足しています'}, cors_headers)

        # ──────────────────────────────────────────────────────────
        # 1. Pending Auth取得
        # ──────────────────────────────────────────────────────────
        pending = get_pending_auth(pending_key)
        if not pending:
            logger.warning("Pending auth not found or expired")
            return create_response(401, {'error': 'SessionExpired'}, cors_headers)

        tenant_id = pending['tenant_id']
        email = pending['email']
        cognito_session = pending['cognito_session']
        user_info = pending['user_info']

        logger.append_keys(tenant_id=tenant_id, email=mask_email(email))
        logger.info("OTP verification started", action_category="AUTH")

        # ──────────────────────────────────────────────────────────
        # 2. Cognitoにチャレンジ応答
        # ──────────────────────────────────────────────────────────
        try:
            challenge_resp = cognito.admin_respond_to_auth_challenge(
                UserPoolId=USER_POOL_ID,
                ClientId=CLIENT_ID,
                ChallengeName='CUSTOM_CHALLENGE',
                Session=cognito_session,
                ChallengeResponses={
                    'USERNAME': email,
                    'ANSWER': otp_code
                }
            )
        except cognito.exceptions.NotAuthorizedException:
            logger.warning("OTP verification failed - NotAuthorized", action_category="AUTH")
            save_access_log(
                tenant_id=tenant_id,
                email=email,
                ip_address=source_ip,
                user_agent=user_agent,
                event_type='Login(OTP)', # OTP段階での失敗とわかるように
                result='Failure',
                detail='InvalidOTP'
            )

            return create_response(401, {'error': 'InvalidOTP'}, cors_headers)
        except cognito.exceptions.CodeMismatchException:
        # ★ ここにもログ保存を追加すると、入力ミスも検知できます
            logger.warning("OTP verification failed - CodeMismatch", action_category="AUTH")
            save_access_log(
                tenant_id=tenant_id, email=email, ip_address=source_ip,
                user_agent=user_agent, event_type='Login(OTP)',
                result='Failure', detail='CodeMismatch'
            )
            return create_response(401, {'error': 'InvalidOTP'}, cors_headers)

        except Exception as e:
            # ★ 予期せぬエラーも記録しておくとデバッグに役立ちます
            logger.exception("OTP verification failed")
            save_access_log(
                tenant_id=tenant_id, email=email, ip_address=source_ip,
                user_agent=user_agent, event_type='Login(OTP)',
                result='Failure', detail=str(e)
            )
            return create_response(401, {'error': 'InvalidOTP'}, cors_headers)
        # ──────────────────────────────────────────────────────────
        # 3. 結果判定
        # ──────────────────────────────────────────────────────────

        # まだチャレンジが続く場合（再試行）
        if 'ChallengeName' in challenge_resp:
            # 新しいSessionを保存して再試行を許可
            new_session = challenge_resp.get('Session')
            if new_session:
                # Pending Authを更新
                delete_pending_auth(pending_key)
                new_pending_key = save_pending_auth(tenant_id, email, new_session, user_info)
                return create_response(401, {
                    'error': 'InvalidOTP',
                    'retry': True,
                    'pending_key': new_pending_key
                }, cors_headers)
            return create_response(401, {'error': 'InvalidOTP'}, cors_headers)

        # 認証成功
        if 'AuthenticationResult' not in challenge_resp:
            logger.error("No AuthenticationResult in response")
            return create_response(500, {'error': 'AuthFailed'}, cors_headers)

        tokens = challenge_resp['AuthenticationResult']

        # Pending Auth削除
        delete_pending_auth(pending_key)

        logger.info("OTP verification successful", action_category="AUTH")

        # セッション発行
        return create_session_and_response(tokens, user_info, event, cors_headers)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'InvalidJSONFormat'}, cors_headers)
    except Exception:
        logger.exception("Verify OTP error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)


def handle_resend_otp(event: dict, cors_headers: dict) -> dict:
    """OTP再送信"""
    try:
        body = json.loads(event.get('body', '{}'))
        pending_key = body.get('pending_key', '').strip()

        if not pending_key:
            return create_response(400, {'error': 'pending_key is required'}, cors_headers)

        # Pending Auth取得
        pending = get_pending_auth(pending_key)
        if not pending:
            return create_response(401, {'error': 'SessionExpired'}, cors_headers)

        tenant_id = pending['tenant_id']
        email = pending['email']
        cognito_session = pending['cognito_session']
        user_info = pending['user_info']

        logger.append_keys(tenant_id=tenant_id, email=mask_email(email))
        logger.info("OTP resend requested", action_category="AUTH")

        # RESENDを送信してdefine_authで再チャレンジ
        try:
            challenge_resp = cognito.admin_respond_to_auth_challenge(
                UserPoolId=USER_POOL_ID,
                ClientId=CLIENT_ID,
                ChallengeName='CUSTOM_CHALLENGE',
                Session=cognito_session,
                ChallengeResponses={
                    'USERNAME': email,
                    'ANSWER': 'RESEND'
                }
            )
        except Exception as e:
            logger.exception("OTP resend failed")
            return create_response(500, {'error': 'ResendFailed'}, cors_headers)

        # 新しいSessionを保存
        new_session = challenge_resp.get('Session')
        if not new_session:
            return create_response(500, {'error': 'ResendFailed'}, cors_headers)

        delete_pending_auth(pending_key)
        new_pending_key = save_pending_auth(tenant_id, email, new_session, user_info)

        logger.info("OTP resent successfully", action_category="AUTH")

        return create_response(200, {
            'success': True,
            'pending_key': new_pending_key,
            'masked_email': mask_email(email)
        }, cors_headers)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'InvalidJSONFormat'}, cors_headers)
    except Exception:
        logger.exception("Resend OTP error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)


def create_session_and_response(tokens: Dict, user_info: Dict, event: dict, cors_headers: dict) -> dict:
    """セッション作成してCookieレスポンスを返す"""
    email = user_info.get('email', '')
    now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    tenant_id = user_info.get('custom:tenant_id', 'UNKNOWN')
    user_sub = user_info.get('sub') # subを取得

    # RequestContextからIPとUAを取得
    http_ctx = event.get('requestContext', {}).get('http', {})
    source_ip = http_ctx.get('sourceIp', 'unknown')
    user_agent = http_ctx.get('userAgent', '')

    # ▼▼▼ 追加: 成功ログの保存 ▼▼▼
    save_access_log(
        tenant_id=tenant_id,
        email=email,
        user_sub=user_sub,
        ip_address=source_ip,
        user_agent=user_agent,
        event_type='Login',
        result='Success'
    )

    has_passkey = False
    try:
        passkey_resp = cognito.list_web_authn_credentials(
            AccessToken=tokens['AccessToken']
        )
        has_passkey = len(passkey_resp.get('Credentials', [])) > 0
    except Exception:
        logger.warning("Failed to check passkey status")

    # ユーザーマスタ更新 & Role取得
    try:
        master_resp = user_master_table.update_item(
            Key={'tenant_id': tenant_id, 'email': email},
            UpdateExpression="""
                SET last_login_at = :now, 
                    last_login_ip = :ip, 
                    #s = :status,
                    updated_at = :now
            """,
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":now": now_iso,
                ":ip": source_ip,
                ":status": "ACTIVE"
            },
            ReturnValues="ALL_NEW"
        )
        user_master = master_resp.get('Attributes', {})
        user_role = user_master.get('role', 'user')
    except ClientError:
        logger.error("Failed to update user master")
        user_role = 'user'

    # セッション作成
    session_id = generate_session_id()
    hashed_id = hash_session_id(session_id)
    current_time = int(time.time())
    expires_at = current_time + SESSION_TTL_SECONDS

    session_table.put_item(Item={
        'session_id': hashed_id,
        'tenant_id': tenant_id,
        'email': email,
        'role': user_role,
        'has_passkey': has_passkey,
        'id_token': encrypt_token(tokens['IdToken']),
        'access_token': encrypt_token(tokens['AccessToken']),
        'refresh_token': encrypt_token(tokens['RefreshToken']),
        'expires_at': expires_at,
        'created_at': current_time,
        'ttl': expires_at + 86400,
    })

    logger.info("Login successful", extra={
        'email': mask_email(email),
        'tenant_id': tenant_id,
        'role': user_role,
        'ip': source_ip
    })

    cookie = build_cookie('sessionId', session_id, SESSION_TTL_SECONDS)
    response = create_response(200, {'success': True}, cors_headers)
    response['headers']['Set-Cookie'] = cookie
    return response


def handle_cognito_error(e, cors_headers):
    """Cognitoの例外をフロントエンド向けにマッピング"""
    error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', 'InternalServerError')

    if error_code in ['NotAuthorizedException', 'UserNotFoundException']:
        logger.warning(f"Auth failure: {error_code}")
        return create_response(401, {'error': 'InvalidUsernameOrPassword'}, cors_headers)

    if error_code == 'UserNotConfirmedException':
        return create_response(401, {'error': 'UserNotConfirmedException'}, cors_headers)

    if error_code == 'PasswordResetRequiredException':
        return create_response(401, {'error': 'PasswordResetRequiredException'}, cors_headers)

    if error_code == 'LimitExceededException':
        logger.warning("Limit exceeded: Account or IP might be throttled")
        return create_response(429, {'error': 'LimitExceededException'}, cors_headers)

    logger.error(f"Cognito error: {error_code}")
    return create_response(401, {'error': error_code}, cors_headers)


def handle_session_check(event: dict, cors_headers: dict) -> dict:
    """セッション確認: 認証状態とユーザー情報を返す"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if not session_id or len(session_id) > 64:
        return create_response(200, {'authenticated': False}, cors_headers)

    hashed_id = hash_session_id(session_id)

    try:
        resp = session_table.get_item(Key={'session_id': hashed_id}, ConsistentRead=True)
        session = resp.get('Item')

        if not session or session.get('expires_at', 0) < int(time.time()):
            return create_response(200, {'authenticated': False}, cors_headers)

        if session.get('type') == 'pending_auth':
            return create_response(200, {'authenticated': False}, cors_headers)

        return create_response(200, {
            'authenticated': True,
            'user': {
                'email': session.get('email'),
                'tenant_id': session.get('tenant_id'),
                'role': session.get('role'),
                'hasPasskey': session.get('has_passkey', False),  # ★ 追加
            }
        }, cors_headers)

    except Exception:
        logger.exception("Session check error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)

def handle_logout(event: dict, cors_headers: dict) -> dict:
    """ログアウト: セッション削除 + Cognitoグローバルサインアウト + Cookieクリア"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if session_id and len(session_id) <= 64:
        hashed_id = hash_session_id(session_id)
        try:
            resp = session_table.get_item(Key={'session_id': hashed_id})
            session = resp.get('Item')

            if session and session.get('access_token'):
                try:
                    cognito.global_sign_out(
                        AccessToken=decrypt_token(session['access_token'])
                    )
                except Exception:
                    pass

            session_table.delete_item(Key={'session_id': hashed_id})
            logger.info("Logout successful")

        except Exception:
            logger.exception("Logout error")

    cookie = build_cookie('sessionId', '', 0)
    response = create_response(200, {'success': True}, cors_headers)
    response['headers']['Set-Cookie'] = cookie
    return response


def handle_refresh(event: dict, cors_headers: dict) -> dict:
    """トークンリフレッシュ: 新しいトークンの取得とセッション延長"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if not session_id or len(session_id) > 64:
        return create_response(401, {'error': 'SessionNotFound'}, cors_headers)

    hashed_id = hash_session_id(session_id)

    try:
        resp = session_table.get_item(Key={'session_id': hashed_id})
        session = resp.get('Item')

        if not session:
            return create_response(401, {'error': 'InvalidSession'}, cors_headers)

        # pending_authは通常セッションではない
        if session.get('type') == 'pending_auth':
            return create_response(401, {'error': 'InvalidSession'}, cors_headers)

        current_time = int(time.time())

        if session.get('expires_at', 0) < current_time:
            session_table.delete_item(Key={'session_id': hashed_id})
            cookie = build_cookie('sessionId', '', 0)
            response = create_response(401, {'error': 'SessionExpired'}, cors_headers)
            response['headers']['Set-Cookie'] = cookie
            return response

        if session.get('created_at', 0) + MAX_SESSION_DURATION < current_time:
            session_table.delete_item(Key={'session_id': hashed_id})
            cookie = build_cookie('sessionId', '', 0)
            response = create_response(401, {'error': 'MaxSessionDurationExceeded'}, cors_headers)
            response['headers']['Set-Cookie'] = cookie
            return response

        encrypted_refresh_token = session.get('refresh_token')
        if not encrypted_refresh_token:
            return create_response(401, {'error': 'RefreshTokenMissing'}, cors_headers)

        refresh_token = decrypt_token(encrypted_refresh_token)

        try:
            resp = cognito.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={'REFRESH_TOKEN': refresh_token}
            )
        except cognito.exceptions.NotAuthorizedException:
            session_table.delete_item(Key={'session_id': hashed_id})
            cookie = build_cookie('sessionId', '', 0)
            response = create_response(401, {'error': 'SessionExpired'}, cors_headers)
            response['headers']['Set-Cookie'] = cookie
            return response

        new_tokens = resp['AuthenticationResult']
        new_expires_at = int(time.time()) + SESSION_TTL_SECONDS

        update_expression = 'SET id_token = :id, access_token = :access, expires_at = :exp, #ttl = :ttl'
        expression_values = {
            ':id': encrypt_token(new_tokens['IdToken']),
            ':access': encrypt_token(new_tokens['AccessToken']),
            ':exp': new_expires_at,
            ':ttl': new_expires_at + 86400,
        }

        if 'RefreshToken' in new_tokens:
            update_expression += ', refresh_token = :refresh'
            expression_values[':refresh'] = encrypt_token(new_tokens['RefreshToken'])

        session_table.update_item(
            Key={'session_id': hashed_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#ttl': 'ttl'},
            ExpressionAttributeValues=expression_values
        )

        cookie = build_cookie('sessionId', session_id, SESSION_TTL_SECONDS)
        response = create_response(200, {'success': True}, cors_headers)
        response['headers']['Set-Cookie'] = cookie
        return response

    except Exception:
        logger.exception("Refresh error")
        return create_response(500, {'error': 'InternalServerError'}, cors_headers)


# ============================================
# パスワードリセット
# ============================================

def handle_forgot_password(event: dict, cors_headers: dict) -> dict:
    """パスワードリセット用のコード送信"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip()

        if not email:
            return create_response(400, {'error': 'Email is required'}, cors_headers)

        try:
            cognito.forgot_password(
                ClientId=CLIENT_ID,
                Username=email
            )
        except cognito.exceptions.UserNotFoundException:
            # セキュリティ上、ユーザーが存在しなくても成功を返す
            pass
        except cognito.exceptions.LimitExceededException:
            return create_response(429, {'error': 'LimitExceeded'}, cors_headers)
        except Exception as e:
            logger.exception("Forgot password error")
            return create_response(500, {'error': 'InternalServerError'}, cors_headers)

        logger.info("Password reset code sent", email=mask_email(email))
        return create_response(200, {
            'success': True,
            'masked_email': mask_email(email)
        }, cors_headers)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'InvalidJSONFormat'}, cors_headers)


def handle_reset_password(event: dict, cors_headers: dict) -> dict:
    """パスワードリセットの実行"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip()
        code = body.get('code', '').strip()
        new_password = body.get('new_password', '')

        if not email or not code or not new_password:
            return create_response(400, {'error': 'Missing required fields'}, cors_headers)

        try:
            cognito.confirm_forgot_password(
                ClientId=CLIENT_ID,
                Username=email,
                ConfirmationCode=code,
                Password=new_password
            )
        except cognito.exceptions.CodeMismatchException:
            return create_response(400, {'error': 'InvalidCode'}, cors_headers)
        except cognito.exceptions.ExpiredCodeException:
            return create_response(400, {'error': 'CodeExpired'}, cors_headers)
        except cognito.exceptions.InvalidPasswordException as e:
            return create_response(400, {'error': 'InvalidPassword', 'message': str(e)}, cors_headers)
        except cognito.exceptions.LimitExceededException:
            return create_response(429, {'error': 'LimitExceeded'}, cors_headers)
        except Exception:
            logger.exception("Reset password error")
            return create_response(500, {'error': 'InternalServerError'}, cors_headers)

        logger.info("Password reset successful", email=mask_email(email))
        return create_response(200, {'success': True}, cors_headers)

    except json.JSONDecodeError:
        return create_response(400, {'error': 'InvalidJSONFormat'}, cors_headers)
