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

def get_session(event):
    """
    Cookie から sessionId を抽出し、DynamoDB からセッション情報を取得します。
    """
    # API Gateway v2 形式では event['cookies'] にリストで入っています
    cookies = event.get('cookies', [])
    session_id = None

    # Cookie リストから sessionId を探す
    for cookie_str in cookies:
        if cookie_str.startswith("sessionId="):
            # "sessionId=abc123xxx" -> "abc123xxx"
            session_id = cookie_str.split("=")[1]
            break

    # セッションIDが見つからない場合は未認証として返す
    if not session_id:
        return None

    try:
        if not SESSION_TABLE:
            logger.error("SESSION_TABLE environment variable is not set")
            return None

        table = dynamodb.Table(SESSION_TABLE)

        # ★ 修正ポイント:
        # DynamoDB のキー定義に合わせて "session_id" (スネークケース) を使用
        response = table.get_item(
            Key={
                'session_id': session_id
            }
        )

        # 取得できた Item (セッション情報) を返す
        return response.get('Item')

    except Exception as e:
        # 権限不足やキー名の間違いがあるとここでログが出る
        print(f"Session check failed: {str(e)}")
        return None

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