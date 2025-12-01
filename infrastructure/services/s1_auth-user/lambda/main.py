import os
import json
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

# Powertoolsのインポート
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 1. サービスの初期化
# service名は環境変数 POWERTOOLS_SERVICE_NAME でも設定可能
logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TENANT_USER_MASTER_TABLE_NAME")

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

# 2. @event_source デコレータでイベントをオブジェクトとして扱えるようにする
@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False) # log_event=Trueにするとeventを自動ログ出力（本番はFalse推奨）
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):

    # 3. 環境変数のチェック
    if not TABLE_NAME:
        logger.error("Environment variable 'TENANT_USER_MASTER_TABLE_NAME' is not set.")
        return create_response(500, {"message": "Server configuration error"})

    # 4. クレーム情報の取得（オブジェクトアクセスが可能になり、非常に可読性が高い）
    # event.get().get()... の連鎖が不要になります
    if not event.request_context or not event.request_context.authorizer or not event.request_context.authorizer.jwt:
        logger.warning("Invalid request context or missing authorizer.")
        return create_response(400, {"message": "Invalid token"})

    claims = event.request_context.authorizer.jwt.claims

    # 標準属性とカスタム属性の取得
    tenant_id = claims.get("custom:tenant_id") or claims.get("tenant_id")
    user_id = claims.get("sub")

    # 5. 構造化ログの使用（JSON形式でログ出力され、CloudWatch Insightsで検索しやすくなる）
    logger.append_keys(tenant_id=tenant_id, user_id=user_id)

    if not tenant_id or not user_id:
        logger.warning("Missing required claims in token.")
        return create_response(400, {"message": "Invalid token: missing claims"})

    logger.info("Fetching tenant user data")

    # 6. DynamoDB操作（X-Rayトレースも自動で行われる）
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "user_id": user_id,
            }
        )
    except ClientError as e:
        logger.exception("DynamoDB ClientError occurred") # スタックトレース付与
        return create_response(500, {"message": "Database error"})
    except Exception as e:
        logger.exception("Unexpected error")
        return create_response(500, {"message": "Internal server error"})

    user_item = response.get("Item")

    response_body = {
        "tenantId": tenant_id,
        "userId": user_id,
        "tenantUser": user_item
    }

    return create_response(200, response_body)