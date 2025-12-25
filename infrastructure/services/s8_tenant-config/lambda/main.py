import os
import json
import time
import hashlib
from decimal import Decimal
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

from modules import prompt_config, security_config

logger = Logger()
tracer = Tracer()

# 環境変数
TENANT_CONFIG_TABLE = os.environ.get('TENANT_CONFIG_TABLE')
SESSION_TABLE = os.environ.get('SESSION_TABLE')

dynamodb = boto3.resource('dynamodb')
config_table = dynamodb.Table(TENANT_CONFIG_TABLE)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def create_response(status_code: int, body: dict) -> dict:
    """レスポンス生成"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False)
    }


def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()


def get_session(event: APIGatewayProxyEventV2):
    """Cookieからセッション情報を取得"""
    raw_cookies = event.get('cookies', [])
    session_id = None
    for c in raw_cookies:
        if c.startswith("sessionId="):
            session_id = c.split("=")[1]
            break

    if not session_id:
        return None

    hashed_id = hash_session_id(session_id)

    try:
        session_db = dynamodb.Table(SESSION_TABLE)
        resp = session_db.get_item(Key={'session_id': hashed_id})
        item = resp.get('Item')
        if item and item.get('expires_at', 0) > int(time.time()):
            return item
    except Exception as e:
        logger.error(f"Session retrieval error: {str(e)}")
    return None


@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    # CSRFチェック
    raw_headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    if raw_headers.get('x-requested-with', '').lower() != 'xmlhttprequest':
        return create_response(403, {"error": "Forbidden"})

    # セッション認証
    session = get_session(event)
    if not session:
        return create_response(401, {"error": "Unauthorized"})

    tenant_id = session.get('tenant_id')
    logger.append_keys(tenant_id=tenant_id)

    # ルーティング
    path = event.raw_event.get('rawPath', '')
    method = event.request_context.http.method
    body = json.loads(event.body or '{}') if event.body else {}

    # /tenant-config/prompt
    if '/tenant-config/prompt' in path:
        if method == 'GET':
            return prompt_config.handle_get(config_table, tenant_id)
        elif method == 'PUT':
            return prompt_config.handle_put(config_table, tenant_id, body)

    # /tenant-config/security
    elif '/tenant-config/security' in path:
        if method == 'GET':
            return security_config.handle_get(config_table, tenant_id)
        elif method == 'PUT':
            return security_config.handle_put(config_table, tenant_id, body)

    return create_response(404, {"error": "Not found"})