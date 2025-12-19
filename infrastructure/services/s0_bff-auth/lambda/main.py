"""
BFF認証ハンドラー (OTP無効版)
シンプルなusername/password認証のみ
HttpOnly Cookieでセッション管理
"""
import os
import json
import boto3
import secrets
import time
from typing import Dict, Optional
from botocore.exceptions import ClientError
import base64

# AWS クライアント
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

# 環境変数
USER_POOL_ID = os.environ['USER_POOL_ID']
CLIENT_ID = os.environ['CLIENT_ID']
SESSION_TABLE = os.environ['SESSION_TABLE']
ALLOWED_ORIGINS = os.environ['ALLOWED_ORIGINS'].split(',')
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

# DynamoDBテーブル
session_table = dynamodb.Table(SESSION_TABLE)


def generate_session_id() -> str:
    """セキュアなセッションID生成"""
    return secrets.token_urlsafe(32)


def lambda_handler(event: Dict, context) -> Dict:
    """メインハンドラー"""
    path = event.get('path', '')
    method = event.get('httpMethod', '')

    # CORS対応
    origin = event.get('headers', {}).get('origin', '')
    cors_headers = get_cors_headers(origin)

    log_request(method, path)

    try:
        # ルーティング
        if path == '/bff/auth/login' and method == 'POST':
            return handle_login(event, cors_headers)
        elif path == '/bff/auth/logout' and method == 'POST':
            return handle_logout(event, cors_headers)
        elif path == '/bff/auth/session' and method == 'GET':
            return handle_session_check(event, cors_headers)
        elif path == '/bff/auth/refresh' and method == 'POST':
            return handle_refresh(event, cors_headers)
        else:
            return error_response(404, 'Not Found', cors_headers)

    except Exception as e:
        log_error('Unhandled exception', str(e))
        return error_response(500, 'Internal Server Error', cors_headers)


def handle_login(event: Dict, cors_headers: Dict) -> Dict:
    """ログイン処理"""
    try:
        body = json.loads(event['body'])
        username = body.get('username', '').strip()
        password = body.get('password', '').strip()

        if not username or not password:
            return error_response(400, 'ユーザー名とパスワードを入力してください', cors_headers)

        log_info('Login attempt', username=username)

        # Cognitoに認証
        response = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )

        # トークン取得
        if 'AuthenticationResult' not in response:
            return error_response(401, '認証に失敗しました', cors_headers)

        tokens = response['AuthenticationResult']

        # セッションID生成
        session_id = generate_session_id()

        # DynamoDBに保存
        save_session(session_id, tokens, username)

        log_info('Login successful', username=username)

        # HttpOnly Cookieで返す
        return {
            'statusCode': 200,
            'headers': {
                **cors_headers,
                'Set-Cookie': create_cookie(session_id, max_age=3600)
            },
            'body': json.dumps({
                'success': True,
                'message': 'ログインしました'
            })
        }

    except cognito.exceptions.NotAuthorizedException:
        log_warn('Login failed - invalid credentials')
        return error_response(401, 'ユーザー名またはパスワードが正しくありません', cors_headers)
    except cognito.exceptions.UserNotFoundException:
        log_warn('Login failed - user not found')
        return error_response(401, 'ユーザー名またはパスワードが正しくありません', cors_headers)
    except KeyError as e:
        log_error('Missing field', str(e))
        return error_response(400, 'リクエストが正しくありません', cors_headers)
    except Exception as e:
        log_error('Login error', str(e))
        return error_response(500, '認証エラーが発生しました', cors_headers)


def handle_logout(event: Dict, cors_headers: Dict) -> Dict:
    """ログアウト処理"""
    try:
        cookies = parse_cookies(event.get('headers', {}).get('Cookie', ''))
        session_id = cookies.get('sessionId')

        if session_id:
            delete_session(session_id)
            log_info('Logout successful', session_id=session_id[:8])

        return {
            'statusCode': 200,
            'headers': {
                **cors_headers,
                'Set-Cookie': create_cookie('', max_age=0)  # Cookie削除
            },
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        log_error('Logout error', str(e))
        return error_response(500, 'ログアウトに失敗しました', cors_headers)


# infrastructure/services/s0_bff-auth/lambda/handler.py
# handle_session_check 関数を修正

def handle_session_check(event: Dict, cors_headers: Dict) -> Dict:
    """セッション確認 + ユーザー情報取得"""
    try:
        cookies = parse_cookies(event.get('headers', {}).get('Cookie', ''))
        session_id = cookies.get('sessionId')

        if not session_id:
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'authenticated': False})
            }

        session = get_session(session_id)

        if not session:
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'authenticated': False})
            }

        # ★追加: IDトークンからユーザー情報を取得
        user_info = decode_id_token(session.get('id_token'))

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'authenticated': True,
                'user': {
                    'id': session.get('user_id'),
                    'email': user_info.get('email'),
                    'name': user_info.get('name'),
                    'family_name': user_info.get('family_name'),
                    'given_name': user_info.get('given_name'),
                }
            })
        }
    except Exception as e:
        log_error('Session check error', str(e))
        return error_response(500, 'セッション確認に失敗しました', cors_headers)

def decode_id_token(id_token: str) -> Dict:
    """IDトークンからユーザー情報を取得"""
    try:
        # JWTの payload 部分 (2番目) を取得
        payload = id_token.split('.')[1]
        # Base64デコード (パディング調整)
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        log_error('Token decode error', str(e))
        return {}

def handle_refresh(event: Dict, cors_headers: Dict) -> Dict:
    """トークンリフレッシュ"""
    try:
        cookies = parse_cookies(event.get('headers', {}).get('Cookie', ''))
        session_id = cookies.get('sessionId')

        if not session_id:
            return error_response(401, 'セッションがありません', cors_headers)

        session = get_session(session_id)
        if not session:
            return error_response(401, 'セッションが無効です', cors_headers)

        # Refresh Tokenで更新
        response = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': session['refresh_token']
            }
        )

        # 新しいトークンで更新
        tokens = response['AuthenticationResult']
        update_session_tokens(session_id, tokens)

        log_info('Token refreshed', session_id=session_id[:8])

        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        log_error('Token refresh error', str(e))
        return error_response(401, 'トークンの更新に失敗しました', cors_headers)


# ─────────────────────────────
# セッション管理関数
# ─────────────────────────────
def save_session(session_id: str, tokens: Dict, user_id: str) -> None:
    """セッションをDynamoDBに保存"""
    session_table.put_item(
        Item={
            'session_id': session_id,
            'user_id': user_id,
            'access_token': tokens['AccessToken'],
            'id_token': tokens['IdToken'],
            'refresh_token': tokens['RefreshToken'],
            'expires_at': int(time.time()) + 3600,
            'created_at': int(time.time())
        }
    )


def get_session(session_id: str) -> Optional[Dict]:
    """セッションをDynamoDBから取得"""
    try:
        response = session_table.get_item(Key={'session_id': session_id})
        item = response.get('Item')

        # 期限チェック
        if item and item.get('expires_at', 0) > int(time.time()):
            return item
    except ClientError as e:
        log_error('DynamoDB get error', str(e))
    return None


def delete_session(session_id: str) -> None:
    """セッションを削除"""
    try:
        session_table.delete_item(Key={'session_id': session_id})
    except ClientError as e:
        log_error('DynamoDB delete error', str(e))


def update_session_tokens(session_id: str, tokens: Dict) -> None:
    """トークンを更新"""
    try:
        session_table.update_item(
            Key={'session_id': session_id},
            UpdateExpression='SET access_token = :access, id_token = :id, expires_at = :exp',
            ExpressionAttributeValues={
                ':access': tokens['AccessToken'],
                ':id': tokens['IdToken'],
                ':exp': int(time.time()) + 3600
            }
        )
    except ClientError as e:
        log_error('DynamoDB update error', str(e))


# ─────────────────────────────
# ユーティリティ関数
# ─────────────────────────────
def create_cookie(session_id: str, max_age: int = 3600) -> str:
    """HttpOnly Cookieを生成"""
    cookie_parts = [
        f'sessionId={session_id}',
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        'Path=/',
        f'Max-Age={max_age}'
    ]
    return '; '.join(cookie_parts)


def parse_cookies(cookie_header: str) -> Dict[str, str]:
    """Cookie文字列をパース"""
    cookies = {}
    if cookie_header:
        for item in cookie_header.split(';'):
            if '=' in item:
                key, value = item.strip().split('=', 1)
                cookies[key] = value
    return cookies


def get_cors_headers(origin: str) -> Dict[str, str]:
    """CORS用ヘッダー"""
    if origin in ALLOWED_ORIGINS:
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        }
    return {'Content-Type': 'application/json'}


def error_response(status_code: int, message: str, headers: Dict) -> Dict:
    """エラーレスポンス"""
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps({'error': message})
    }


# ログ関数
def log_info(message: str, **kwargs):
    if LOG_LEVEL == 'INFO':
        print(json.dumps({'level': 'INFO', 'message': message, **kwargs}))


def log_warn(message: str, **kwargs):
    print(json.dumps({'level': 'WARN', 'message': message, **kwargs}))


def log_error(message: str, error: str):
    print(json.dumps({'level': 'ERROR', 'message': message, 'error': error}))


def log_request(method: str, path: str):
    if LOG_LEVEL == 'INFO':
        print(json.dumps({'level': 'INFO', 'message': 'Request', 'method': method, 'path': path}))