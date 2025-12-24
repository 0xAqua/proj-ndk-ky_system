import os
import json
import time
import hashlib
from decimal import Decimal
import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

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


def handle_get(tenant_id: str) -> dict:
    """テナント設定を取得"""
    try:
        resp = config_table.get_item(Key={'tenant_id': tenant_id})
        item = resp.get('Item')

        if not item:
            return create_response(404, {"error": "Config not found"})

        # prompt_configのみ返す
        return create_response(200, {
            "tenant_id": item.get("tenant_id"),
            "prompt_config": item.get("prompt_config", {})
        })

    except Exception as e:
        logger.exception(f"handle_get error: {str(e)}")
        return create_response(500, {"error": str(e)})


def handle_put(tenant_id: str, body: dict) -> dict:
    """テナント設定を更新"""
    try:
        prompt_config = body.get('prompt_config')

        if not prompt_config:
            return create_response(400, {"error": "prompt_config is required"})

        # バリデーション
        required_keys = ['total_incidents', 'fact_incidents', 'countermeasures_per_case', 'include_predicted_incidents']
        for key in required_keys:
            if key not in prompt_config:
                return create_response(400, {"error": f"Missing required key: {key}"})

        # 数値バリデーション
        if not isinstance(prompt_config.get('total_incidents'), int) or prompt_config['total_incidents'] < 1:
            return create_response(400, {"error": "total_incidents must be a positive integer"})

        if not isinstance(prompt_config.get('fact_incidents'), int) or prompt_config['fact_incidents'] < 0:
            return create_response(400, {"error": "fact_incidents must be a non-negative integer"})

        if not isinstance(prompt_config.get('countermeasures_per_case'), int) or prompt_config['countermeasures_per_case'] < 1:
            return create_response(400, {"error": "countermeasures_per_case must be a positive integer"})

        if not isinstance(prompt_config.get('include_predicted_incidents'), bool):
            return create_response(400, {"error": "include_predicted_incidents must be a boolean"})

        # fact_incidents <= total_incidents チェック
        if prompt_config['fact_incidents'] > prompt_config['total_incidents']:
            return create_response(400, {"error": "fact_incidents cannot exceed total_incidents"})

        now = int(time.time())

        # 既存チェック
        existing = config_table.get_item(Key={'tenant_id': tenant_id}).get('Item')

        if existing:
            # 更新
            config_table.update_item(
                Key={'tenant_id': tenant_id},
                UpdateExpression="SET prompt_config = :pc, updated_at = :ua",
                ExpressionAttributeValues={
                    ':pc': prompt_config,
                    ':ua': now
                }
            )
        else:
            # 新規作成
            config_table.put_item(Item={
                'tenant_id': tenant_id,
                'prompt_config': prompt_config,
                'created_at': now,
                'updated_at': now
            })

        return create_response(200, {
            "message": "Config updated successfully",
            "tenant_id": tenant_id,
            "prompt_config": prompt_config
        })

    except Exception as e:
        logger.exception(f"handle_put error: {str(e)}")
        return create_response(500, {"error": str(e)})


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
    method = event.request_context.http.method

    if method == 'GET':
        return handle_get(tenant_id)
    elif method == 'PUT':
        body = json.loads(event.body or '{}')
        return handle_put(tenant_id, body)

    return create_response(405, {"error": "Method not allowed"})
