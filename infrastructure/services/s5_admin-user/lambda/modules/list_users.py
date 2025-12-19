import json
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import tenant_user_master_table

logger = Logger()
tracer = Tracer()

# ★ 修正: 特定のOriginを返し、Credentialsを許可する形式に変更
def create_response(status_code: int, body: dict, origin: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,         # ★ originを動的に指定
            "Access-Control-Allow-Credentials": "true"      # ★ Cookie使用時は必須
        },
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

@tracer.capture_method
def handle(event, ctx):
    """ユーザー一覧取得（DynamoDBのみ参照）"""
    tenant_id = ctx["tenant_id"]
    origin = ctx.get("origin", "*") # ★ main.py から渡される origin を取得

    logger.info("ユーザー一覧を取得します", action_category="EXECUTE")

    try:
        #
        response = tenant_user_master_table.query(
            KeyConditionExpression="tenant_id = :tid",
            ExpressionAttributeValues={":tid": tenant_id}
        )
        users = response.get("Items", [])

        # COMMONを除外（全ユーザーに強制で入るため）
        for user in users:
            if "departments" in user:
                user["departments"] = {
                    k: v for k, v in user["departments"].items()
                    if k != "COMMON"
                }

        logger.info(f"ユーザー一覧取得完了: {len(users)}件", action_category="EXECUTE")

        return create_response(200, {
            "users": users,
            "count": len(users)
        }, origin)

    except ClientError:
        logger.exception("データ取得に失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Database access error"}, origin)