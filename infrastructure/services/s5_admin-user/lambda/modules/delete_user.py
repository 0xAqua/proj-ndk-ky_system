import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table
from shared.operation_logger import log_user_deleted  # ★ 追加

logger = Logger()
tracer = Tracer()

def create_response(status_code: int, body: dict, origin: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

@tracer.capture_method
def handle(event, ctx, email):
    """ユーザー削除 (Cognito + DynamoDB 同時物理削除)"""
    tenant_id = ctx["tenant_id"]
    caller_email = ctx["caller_email"]
    origin = ctx.get("origin", "*")
    ip_address = ctx.get("ip_address", "")  # ★ 追加

    logger.info(f"ユーザー削除リクエスト: {email}", extra={"target_email": email, "deleted_by": caller_email})

    try:
        # 1. 削除対象の存在確認
        existing_resp = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "email": email}
        )
        existing = existing_resp.get("Item")

        if not existing:
            logger.warning(f"削除対象が見つかりません: {email}")
            return create_response(404, {"message": "User not found"}, origin)

        # 2. Cognito からの削除
        try:
            cognito.admin_delete_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            logger.info(f"Cognitoユーザーを削除しました: {email}")
        except cognito.exceptions.UserNotFoundException:
            logger.warning(f"Cognito上にユーザーが存在しませんでした: {email}")

        # 3. DynamoDB からの削除
        tenant_user_master_table.delete_item(
            Key={"tenant_id": tenant_id, "email": email},
            ConditionExpression="attribute_exists(email)"
        )

        # ★ 操作履歴を記録
        log_user_deleted(
            tenant_id=tenant_id,
            email=caller_email,
            target_email=email,
            ip_address=ip_address
        )

        logger.info(f"ユーザーの物理削除が完了しました: {email}")

        return create_response(200, {"message": "User deleted successfully"}, origin)

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return create_response(404, {"message": "User not found during deletion"}, origin)
        logger.exception("ユーザー削除中にデータベースエラーが発生しました")
        return create_response(500, {"message": "Database error"}, origin)
    except Exception:
        logger.exception("ユーザー削除中に予期せぬエラーが発生しました")
        return create_response(500, {"message": "Internal server error"}, origin)