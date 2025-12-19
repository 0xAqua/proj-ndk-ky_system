"""
S7 Logs Service - Main Handler (BFF統合版)
"""
import json
import os
import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from modules import execution_logs

logger = Logger()
dynamodb = boto3.resource('dynamodb')
SESSION_TABLE = os.environ.get('SESSION_TABLE_NAME')

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

def get_session(event: dict):
    """Cookieからセッション情報を取得"""
    cookies = event.get('cookies', [])
    sid = next((c.split('=')[1] for c in cookies if c.startswith('sessionId=')), None)
    if not sid: return None
    return dynamodb.Table(SESSION_TABLE).get_item(Key={'sessionId': sid}).get('Item')

@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext) -> dict:
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