import os
import json
import boto3
import secrets
import time
import base64
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

# 環境変数
USER_POOL_ID = os.environ['USER_POOL_ID']
CLIENT_ID = os.environ['CLIENT_ID']
SESSION_TABLE = os.environ['SESSION_TABLE']
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '').split(',')

# DynamoDBテーブル
session_table = dynamodb.Table(SESSION_TABLE)

# --- 共通ユーティリティ ---

def create_response(status_code: int, body: dict, cors_headers: dict) -> dict:
    """標準レスポンス生成"""
    return {
        'statusCode': status_code,
        'headers': cors_headers,
        'body': json.dumps(body, ensure_ascii=False)
    }

def get_cors_headers(origin: str) -> Dict[str, str]:
    """CORS用ヘッダー取得"""
    headers = {'Content-Type': 'application/json'}
    if origin in ALLOWED_ORIGINS:
        headers.update({
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
        })
    return headers

def parse_cookies(event: dict) -> dict:
    """API Gateway v2 の cookies リストをパース"""
    raw_cookies = event.get('cookies', [])
    cookies = {}
    for c in raw_cookies:
        if '=' in c:
            k, v = c.split('=', 1)
            cookies[k] = v
    return cookies

def decode_id_token(id_token: str) -> Dict:
    """IDトークンのペイロードをデコード"""
    try:
        payload = id_token.split('.')[1]
        payload += '=' * (4 - len(payload) % 4)
        return json.loads(base64.b64decode(payload))
    except Exception:
        return {}

# --- メインハンドラー ---

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext):
    method = event.get('requestContext', {}).get('http', {}).get('method', '')
    path = event.get('rawPath', '')
    headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
    origin = headers.get('origin', '')
    cors_headers = get_cors_headers(origin)

    # 1. CSRFチェック (カスタムヘッダーの存在を確認)
    if headers.get('x-requested-with', '').lower() != 'xmlhttprequest':
        logger.warning("CSRF check failed")
        return create_response(403, {'error': 'Forbidden'}, cors_headers)

    # 2. ルーティング
    if path == '/bff/auth/login' and method == 'POST':
        return handle_login(event, cors_headers)
    elif path == '/bff/auth/session' and method == 'GET':
        return handle_session_check(event, cors_headers)
    elif path == '/bff/auth/logout' and method == 'POST':
        return handle_logout(event, cors_headers)

    return create_response(404, {'error': 'Not found'}, cors_headers)

# --- 各種アクション ---

def handle_login(event: dict, cors_headers: dict) -> dict:
    """ログイン処理: セッションを作成しCookieをセット"""
    try:
        body = json.loads(event.get('body', '{}'))
        username, password = body.get('username'), body.get('password')

        if not username or not password:
            return create_response(400, {'error': '入力が不足しています'}, cors_headers)

        # Cognito 認証
        resp = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={'USERNAME': username, 'PASSWORD': password}
        )
        tokens = resp['AuthenticationResult']
        user_info = decode_id_token(tokens['IdToken'])

        user_id = user_info.get('sub')
        tenant_id = user_info.get('custom:tenant_id', 'UNKNOWN')

        user_master = dynamodb.Table(os.environ['TENANT_USER_MASTER_TABLE'])
        user_item = user_master.get_item(
            Key={'tenant_id': tenant_id, 'user_id': user_id}
        ).get('Item', {})
        user_role = user_item.get('role', 'viewer')

        # セッション保存
        session_id = secrets.token_urlsafe(32)
        session_table.put_item(Item={
            'session_id': session_id,
            'user_id': user_id,
            'tenant_id': tenant_id,
            'role': user_role,
            'id_token': tokens['IdToken'],
            'refresh_token': tokens['RefreshToken'],
            'expires_at': int(time.time()) + 3600
        })

        logger.info(f"Login successful: {user_id}", tenant_id=tenant_id)

        # sessionId を HttpOnly Cookie で返す
        cookie = f"sessionId={session_id}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600; Partitioned"
        response = create_response(200, {'success': True}, cors_headers)
        response['headers']['Set-Cookie'] = cookie
        return response

    except (cognito.exceptions.NotAuthorizedException, cognito.exceptions.UserNotFoundException):
        return create_response(401, {'error': '認証に失敗しました'}, cors_headers)
    except Exception as e:
        logger.exception("Login error")
        return create_response(500, {'error': 'Internal server error'}, cors_headers)

def handle_session_check(event: dict, cors_headers: dict) -> dict:
    """セッション確認: AuthGuard から呼ばれる門番"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')

    if not session_id:
        return create_response(200, {'authenticated': False}, cors_headers)

    try:
        resp = session_table.get_item(Key={'session_id': session_id})
        session = resp.get('Item')

        # 期限チェック
        if not session or session.get('expires_at', 0) < int(time.time()):
            return create_response(200, {'authenticated': False}, cors_headers)

        # ★ 不要な email や name はここからは返さない (詳細は /me で取得するため)
        return create_response(200, {
            'authenticated': True,
            'user': {
                'id': session.get('user_id'),
                'tenant_id': session.get('tenant_id'),
                'role': session.get('role')
            }
        }, cors_headers)

    except Exception:
        logger.exception("Session check error")
        return create_response(500, {'error': 'Internal server error'}, cors_headers)

def handle_logout(event: dict, cors_headers: dict) -> dict:
    """ログアウト処理: セッション削除とCookieクリア"""
    cookies = parse_cookies(event)
    session_id = cookies.get('sessionId')
    if session_id:
        session_table.delete_item(Key={'session_id': session_id})

    response = create_response(200, {'success': True}, cors_headers)
    response['headers']['Set-Cookie'] = "sessionId=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0; Partitioned"
    return response