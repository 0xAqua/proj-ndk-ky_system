import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table

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
def handle(event, ctx, user_id):
    """ユーザー削除 (Cognito + DynamoDB 同時物理削除)"""
    tenant_id = ctx["tenant_id"]
    caller_user_id = ctx["caller_user_id"] # 削除を実行した管理者のID
    origin = ctx.get("origin", "*")

    logger.info(f"ユーザー削除リクエスト: {user_id}", extra={"target_user_id": user_id, "deleted_by": caller_user_id})

    try:
        # 1. 削除対象の存在確認とメールアドレスの取得
        existing_resp = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "user_id": user_id}
        )
        existing = existing_resp.get("Item")

        if not existing:
            logger.warning(f"削除対象が見つかりません: {user_id}")
            return create_response(404, {"message": "User not found"}, origin)

        email = existing.get("email")

        # 2. Cognito からの削除
        try:
            cognito.admin_delete_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            logger.info(f"Cognitoユーザーを削除しました: {email}")
        except cognito.exceptions.UserNotFoundException:
            # Cognito側に既にない場合はスキップしてDynamoDBの削除を優先する
            logger.warning(f"Cognito上にユーザーが存在しませんでした: {email}")

        # 3. DynamoDB からの削除
        # 条件付き削除により、確実にそのテナントのユーザーであることを担保
        tenant_user_master_table.delete_item(
            Key={"tenant_id": tenant_id, "user_id": user_id},
            ConditionExpression="attribute_exists(user_id)"
        )

        logger.info(f"ユーザーの物理削除が完了しました: {email}", extra={"user_id": user_id})

        return create_response(200, {"message": "User deleted successfully"}, origin)

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return create_response(404, {"message": "User not found during deletion"}, origin)
        logger.exception("ユーザー削除中にデータベースエラーが発生しました")
        return create_response(500, {"message": "Database error"}, origin)
    except Exception:
        logger.exception("ユーザー削除中に予期せぬエラーが発生しました")
        return create_response(500, {"message": "Internal server error"}, origin)