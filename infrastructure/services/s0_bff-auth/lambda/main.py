import os
import json
import boto3
import secrets
import time
import base64
import hashlib
from typing import Dict
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
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '').split(',')
COOKIE_SAME_SITE = os.environ.get('COOKIE_SAME_SITE', 'Strict')
SESSION_TTL_SECONDS = int(os.environ.get('SESSION_TTL_SECONDS', '3600'))
KMS_KEY_ID = os.environ['KMS_KEY_ID']

# DynamoDBテーブル
session_table = dynamodb.Table(SESSION_TABLE)


# ============================================
# 共通ユーティリティ
# ============================================

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
    if COOKIE_SAME_SITE == 'None':
        cookie_parts.append("Partitioned")
    return "; ".join(cookie_parts)


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
    elif path == '/bff/auth/session' and method == 'GET':
        return handle_session_check(event, cors_headers)
    elif path == '/bff/auth/logout' and method == 'POST':
        return handle_logout(event, cors_headers)
    elif path == '/bff/auth/refresh' and method == 'POST':
        return handle_refresh(event, cors_headers)

    return create_response(404, {'error': 'Not found'}, cors_headers)


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
    """ログイン処理: Cognito認証 → セッション作成 → Cookie発行"""
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()
        password = body.get('password', '')

        if not username or not password:
            return create_response(400, {'error': '入力が不足しています'}, cors_headers)

        if len(username) > 128 or len(password) > 256:
            return create_response(400, {'error': '入力が長すぎます'}, cors_headers)

        # ──────────────────────────────────────────────────────────
        # 1. Cognito認証（エラーコードをそのままフロントに返す）
        # ──────────────────────────────────────────────────────────
        try:
            resp = cognito.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )
        except cognito.exceptions.NotAuthorizedException:
            logger.warning("Login failed: invalid credentials")
            return create_response(401, {'error': 'NotAuthorizedException'}, cors_headers)

        except cognito.exceptions.UserNotFoundException:
            logger.warning("Login failed: user not found")
            # セキュリティのため NotAuthorizedException と同じコードを返す
            return create_response(401, {'error': 'NotAuthorizedException'}, cors_headers)

        except cognito.exceptions.UserNotConfirmedException:
            return create_response(401, {'error': 'UserNotConfirmedException'}, cors_headers)

        except cognito.exceptions.PasswordResetRequiredException:
            return create_response(401, {'error': 'PasswordResetRequiredException'}, cors_headers)

        except cognito.exceptions.LimitExceededException:
            # これが「アカウントロック」や「試行制限」のコード
            return create_response(400, {'error': 'LimitExceededException'}, cors_headers)

        except Exception as e:
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', 'InternalServerError')
            logger.exception("Login error")
            return create_response(500, {'error': error_code}, cors_headers)

        tokens = resp['AuthenticationResult']
        user_info = decode_id_token(tokens['IdToken'])

        user_id = user_info.get('sub')
        tenant_id = user_info.get('custom:tenant_id', 'UNKNOWN')
        email = user_info.get('email', '')
        family_name = user_info.get('family_name', '')
        given_name = user_info.get('given_name', '')

        # ユーザーマスタからロール取得
        user_master = dynamodb.Table(os.environ['TENANT_USER_MASTER_TABLE'])
        user_item = user_master.get_item(
            Key={'tenant_id': tenant_id, 'user_id': user_id}
        ).get('Item', {})
        user_role = user_item.get('role', 'viewer')

        # セッション作成
        session_id = generate_session_id()
        hashed_id = hash_session_id(session_id)
        expires_at = int(time.time()) + SESSION_TTL_SECONDS

        session_table.put_item(Item={
            'session_id': hashed_id,
            'user_id': user_id,
            'tenant_id': tenant_id,
            'role': user_role,
            'email': email,
            'family_name': family_name,
            'given_name': given_name,
            'id_token': encrypt_token(tokens['IdToken']),
            'access_token': encrypt_token(tokens['AccessToken']),
            'refresh_token': encrypt_token(tokens['RefreshToken']),
            'expires_at': expires_at,
            'created_at': int(time.time()),
            'ttl': expires_at + 86400,
        })

        logger.info("Login successful", extra={
            'user_id': user_id,
            'tenant_id': tenant_id,
            'role': user_role
        })

        cookie = build_cookie('sessionId', session_id, SESSION_TTL_SECONDS)
        response = create_response(200, {'success': True}, cors_headers)
        response['headers']['Set-Cookie'] = cookie
        return response

    except json.JSONDecodeError:
        return create_response(400, {'error': '不正なリクエスト形式です'}, cors_headers)
    except Exception:
        logger.exception("Login error")
        return create_response(500, {'error': 'Internal server error'}, cors_headers)


def handle_session_check(event: dict, cors_headers: dict) -> dict:
    """セッション確認: 認証状態とユーザー情報を返す"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    # Nullチェックを先に行う
    if not session_id:
        return create_response(200, {'authenticated': False}, cors_headers)

    if len(session_id) > 64:
        return create_response(200, {'authenticated': False}, cors_headers)

    hashed_id = hash_session_id(session_id)

    try:
        resp = session_table.get_item(
            Key={'session_id': hashed_id},
            ConsistentRead=True
        )
        session = resp.get('Item')

        if not session or session.get('expires_at', 0) < int(time.time()):
            return create_response(200, {'authenticated': False}, cors_headers)

        return create_response(200, {
            'authenticated': True,
            'user': {
                'id': session.get('user_id'),
                'tenant_id': session.get('tenant_id'),
                'role': session.get('role'),
                'email': session.get('email', ''),
                'family_name': session.get('family_name', ''),
                'given_name': session.get('given_name', ''),
            }
        }, cors_headers)

    except Exception:
        logger.exception("Session check error")
        return create_response(500, {'error': 'Internal server error'}, cors_headers)


def handle_logout(event: dict, cors_headers: dict) -> dict:
    """ログアウト: セッション削除 + Cookie無効化"""
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
            logger.info("Logout successful", extra={'session_id_prefix': session_id[:8]})

        except Exception:
            logger.exception("Logout error")

    cookie = build_cookie('sessionId', '', 0)
    response = create_response(200, {'success': True}, cors_headers)
    response['headers']['Set-Cookie'] = cookie
    return response


def handle_refresh(event: dict, cors_headers: dict) -> dict:
    """トークンリフレッシュ: セッション延長"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if not session_id or len(session_id) > 64:
        return create_response(401, {'error': 'セッションがありません'}, cors_headers)

    hashed_id = hash_session_id(session_id)

    try:
        resp = session_table.get_item(Key={'session_id': hashed_id})
        session = resp.get('Item')

        if not session:
            return create_response(401, {'error': 'セッションが無効です'}, cors_headers)

        encrypted_refresh_token = session.get('refresh_token')
        if not encrypted_refresh_token:
            return create_response(401, {'error': 'リフレッシュトークンがありません'}, cors_headers)

        # トークンを復号してから使用
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
            response = create_response(401, {'error': 'セッションの有効期限が切れました'}, cors_headers)
            response['headers']['Set-Cookie'] = cookie
            return response

        new_tokens = resp['AuthenticationResult']
        new_expires_at = int(time.time()) + SESSION_TTL_SECONDS

        session_table.update_item(
            Key={'session_id': hashed_id},
            UpdateExpression='SET id_token = :id, access_token = :access, expires_at = :exp, #ttl = :ttl',
            ExpressionAttributeNames={'#ttl': 'ttl'},
            ExpressionAttributeValues={
                ':id': encrypt_token(new_tokens['IdToken']),
                ':access': encrypt_token(new_tokens['AccessToken']),
                ':exp': new_expires_at,
                ':ttl': new_expires_at + 86400,
            }
        )

        cookie = build_cookie('sessionId', session_id, SESSION_TTL_SECONDS)
        response = create_response(200, {'success': True}, cors_headers)
        response['headers']['Set-Cookie'] = cookie
        return response

    except Exception:
        logger.exception("Refresh error")
        return create_response(500, {'error': 'Internal server error'}, cors_headers)