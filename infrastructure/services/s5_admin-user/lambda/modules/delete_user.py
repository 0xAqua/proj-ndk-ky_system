import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table

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
    """ユーザー削除"""
    tenant_id = ctx["tenant_id"]

    logger.info(f"ユーザーを削除します: {user_id}", action_category="EXECUTE")

    try:
        # 既存ユーザー取得
        existing = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "user_id": user_id}
        ).get("Item")

        if not existing:
            logger.warning(f"ユーザーが見つかりません: {user_id}", action_category="ERROR")
            return create_response(404, {"message": "User not found"})

        email = existing.get("email")

        # 1. Cognito から削除
        try:
            cognito.admin_delete_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            logger.info(f"Cognitoユーザー削除完了: {email}", action_category="EXECUTE")
        except cognito.exceptions.UserNotFoundException:
            logger.warning(f"Cognitoにユーザーが存在しません: {email}", action_category="ERROR")

        # 2. DynamoDB から削除
        tenant_user_master_table.delete_item(
            Key={"tenant_id": tenant_id, "user_id": user_id}
        )

        logger.info(f"ユーザー削除完了: {email} ({user_id})", action_category="EXECUTE")

        return create_response(200, {"message": "User deleted successfully"})

    except ClientError:
        logger.exception("ユーザー削除に失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Failed to delete user"})
