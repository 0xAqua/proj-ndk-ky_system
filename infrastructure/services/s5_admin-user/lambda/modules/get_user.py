import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import tenant_user_master_table

logger = Logger()
tracer = Tracer()


def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }


@tracer.capture_method
def handle(event, ctx, user_id):
    """ユーザー詳細取得"""
    tenant_id = ctx["tenant_id"]

    logger.info(f"ユーザー情報を取得します: {user_id}", action_category="EXECUTE")

    try:
        response = tenant_user_master_table.get_item(
            Key={
                "tenant_id": tenant_id,
                "user_id": user_id
            }
        )

        user = response.get("Item")
        if not user:
            logger.warning(f"ユーザーが見つかりません: {user_id}", action_category="ERROR")
            return create_response(404, {"message": "User not found"})

        logger.info(f"ユーザー情報取得完了: {user_id}", action_category="EXECUTE")

        return create_response(200, {"user": user})

    except ClientError:
        logger.exception("DynamoDBアクセスに失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Database access error"})