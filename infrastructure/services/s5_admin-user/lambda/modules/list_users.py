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
def handle(event, ctx):
    """ユーザー一覧取得：フロントエンドの型に最適化したデータを返却"""
    tenant_id = ctx["tenant_id"]
    caller_user_id = ctx["caller_user_id"]
    origin = ctx.get("origin", "*")

    logger.info("ユーザー一覧取得処理を開始", extra={
        "tenant_id": tenant_id,
        "requested_by": caller_user_id
    })

    try:
        # [cite_start]1. DynamoDBから該当テナントの全属性を取得 [cite: 3, 4]
        response = tenant_user_master_table.query(
            KeyConditionExpression="tenant_id = :tid",
            ExpressionAttributeValues={":tid": tenant_id}
        )
        raw_users = response.get("Items", [])

        # 2. フロントエンドの User 型に必要な項目だけに絞り込む (マッピング)
        filtered_users = []
        for u in raw_users:
            # 部署から COMMON を除外
            deps = {k: v for k, v in u.get("departments", {}).items() if k != "COMMON"}

            # React側の User 型に必要なプロパティのみを抽出
            filtered_user = {
                "user_id": u.get("user_id"),
                "email": u.get("email"),
                "family_name": u.get("family_name"),
                "given_name": u.get("given_name"),
                "departments": deps,
                "role": u.get("role"),
                "status": u.get("status"),
                "last_login_at": u.get("last_login_at") # 存在しない場合は None(null) になる
            }
            filtered_users.append(filtered_user)

        logger.info(f"返却データ成形完了: {len(filtered_users)}件")

        return create_response(200, {
            "users": filtered_users,
            "count": len(filtered_users)
        }, origin)

    except ClientError:
        logger.exception("データベースアクセスエラー")
        return create_response(500, {"message": "Database access error"}, origin)