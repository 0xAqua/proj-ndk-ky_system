import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import tenant_user_master_table

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
    """ユーザー詳細取得（DynamoDB参照）"""
    tenant_id = ctx["tenant_id"]
    caller_user_id = ctx["caller_user_id"] # 操作者のIDもログ用に取得
    origin = ctx.get("origin", "*")

    # 監査用ログの強化
    logger.info(f"ユーザー詳細を取得します: {user_id}", extra={
        "action_category": "EXECUTE",
        "target_user_id": user_id,
        "requested_by": caller_user_id
    })

    try:
        response = tenant_user_master_table.get_item(
            Key={
                "tenant_id": tenant_id,
                "user_id": user_id
            }
        )

        user = response.get("Item")
        if not user:
            logger.warning(f"ユーザーが見つかりません: {user_id}", extra={"action_category": "ERROR"})
            return create_response(404, {"message": "User not found"}, origin)

        # ──────────────────────────────────────────────────────────
        # ★ 整合性チェック: list_users.py とルールを合わせる
        # ──────────────────────────────────────────────────────────
        # COMMONを除外（フロントエンドが管理・表示しないシステム用部署のため）
        if "departments" in user:
            user["departments"] = {
                k: v for k, v in user["departments"].items()
                if k != "COMMON"
            }

        logger.info(f"ユーザー情報取得完了: {user_id}", extra={"action_category": "EXECUTE"})

        return create_response(200, {"user": user}, origin)

    except ClientError:
        logger.exception("DynamoDBアクセスに失敗しました", extra={"action_category": "ERROR"})
        return create_response(500, {"message": "Database access error"}, origin)