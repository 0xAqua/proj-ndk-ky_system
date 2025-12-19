import os
import json
import boto3
from botocore.exceptions import ClientError

# Powertoolsのインポート
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 1. サービスの初期化
logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TENANT_USER_MASTER_TABLE_NAME")


def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }


@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):

    # 2. 環境変数のチェック
    if not TABLE_NAME:
        logger.error("環境変数 'TENANT_USER_MASTER_TABLE_NAME' が設定されていません", action_category="ERROR")
        return create_response(500, {"message": "Server configuration error"})

    # 3. トークン(JWT)から情報の取り出し
    # ★修正ポイント:
    # Powertoolsのオブジェクトアクセス(event.request_context...)がエラーになる場合があるため、
    # 'raw_event' (生の辞書データ) から安全に取得する方法に変更しました。
    raw_claims = (
        event.raw_event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    tenant_id = raw_claims.get("custom:tenant_id") or raw_claims.get("tenant_id")
    user_id = raw_claims.get("sub")

    # ログにテナントID等を付与
    logger.append_keys(tenant_id=tenant_id, user_id=user_id)

    if not tenant_id or not user_id:
        logger.warning("トークンにtenant_idまたはuser_idがありません", action_category="ERROR")
        # デバッグ用に claims の中身をログに出す（本番ログで見るとき用）
        logger.debug("受信したclaims", action_category="EXECUTE", claims=raw_claims)
        return create_response(400, {"message": "Invalid token claims"})

    logger.info("テナントユーザー情報を取得します", action_category="EXECUTE")

    # 4. DynamoDBアクセス
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "user_id": user_id,
            }
        )
    except ClientError:
        logger.exception("DynamoDBアクセスに失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Database access error"})
    except Exception:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        return create_response(500, {"message": "Internal server error"})

    # 5. レスポンス返却
    user_item = response.get("Item")

    logger.info("テナントユーザー情報を取得しました", action_category="EXECUTE")

    response_body = {
        "tenantId": tenant_id,
        "userId": user_id,
        "tenantUser": user_item
    }

    return create_response(200, response_body)