"""
S7 Logs Service - Main Handler (BFF統合版)
"""
import json
import os
import boto3
import hashlib
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from modules import execution_logs

logger = Logger()
dynamodb = boto3.resource('dynamodb')
SESSION_TABLE = os.environ.get('SESSION_TABLE')

def create_response(status_code: int, body: dict, origin: str) -> dict:
    """CORS/Cookie対応のレスポンス生成"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }

def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()

def get_session(event):
    cookies = event.get('cookies', [])
    session_id = None

    for cookie_str in cookies:
        if cookie_str.startswith("sessionId="):
            session_id = cookie_str.split("=")[1]
            break

    if not session_id:
        return None

    # ★ ハッシュ化してから検索
    hashed_id = hash_session_id(session_id)

    try:
        if not SESSION_TABLE:
            logger.error("SESSION_TABLE environment variable is not set")
            return None

        table = dynamodb.Table(SESSION_TABLE)

        response = table.get_item(
            Key={
                'session_id': hashed_id  # ★ 修正
            }
        )

        return response.get('Item')

    except Exception as e:
        print(f"Session check failed: {str(e)}")
        return None
@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext) -> dict:
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    expected = os.environ.get("ORIGIN_VERIFY_SECRET")

    if expected and headers.get("x-origin-verify") != expected:
        return {"statusCode": 403, "body": "Forbidden"}

    origin = event.get('headers', {}).get('origin', '')

    # 1. CSRF対策チェック
    x_req = (event.get('headers', {}).get('x-requested-with') or '').lower()
    if x_req != 'xmlhttprequest':
        return create_response(403, {'error': 'Forbidden'}, origin)

    # 2. セッション認証
    session = get_session(event)
    if not session:
        return create_response(401, {'error': 'Unauthorized'}, origin)

    tenant_id = session.get('tenant_id')
    path = event.get('rawPath', '')
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')

    # 3. ルーティング (引数に tenant_id と origin を追加)
    if path == '/logs/execution' and method == 'GET':
        return execution_logs.get_logs(event, context, tenant_id, origin)

    # ... (その他のパス)
    return create_response(404, {'error': 'Not Found'}, origin)