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
def handle(event, ctx):
    """ユーザー一覧取得（Cognito + DynamoDB 混合）"""
    tenant_id = ctx["tenant_id"]

    logger.info("ユーザー一覧を取得します", action_category="EXECUTE")

    try:
        # 1. DynamoDB からテナントのユーザー一覧を取得
        response = tenant_user_master_table.query(
            KeyConditionExpression="tenant_id = :tid",
            ExpressionAttributeValues={":tid": tenant_id}
        )
        db_users = response.get("Items", [])

        # 2. Cognito からユーザー情報を取得してマージ
        users = []
        for db_user in db_users:
            user_id = db_user.get("user_id")

            # Cognito から email, 氏名を取得
            cognito_info = _get_cognito_user_by_sub(user_id)

            # マージ
            merged_user = {
                **db_user,
                "email": cognito_info.get("email", ""),
                "family_name": cognito_info.get("family_name", ""),
                "given_name": cognito_info.get("given_name", ""),
            }
            users.append(merged_user)

        logger.info(f"ユーザー一覧取得完了: {len(users)}件", action_category="EXECUTE")

        return create_response(200, {
            "users": users,
            "count": len(users)
        })

    except ClientError:
        logger.exception("データ取得に失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Database access error"})


def _get_cognito_user_by_sub(user_id: str) -> dict:
    """Cognito から sub (user_id) でユーザー情報を取得"""
    try:
        # ListUsers で sub をフィルタ
        response = cognito.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'sub = "{user_id}"',
            Limit=1
        )

        users = response.get("Users", [])
        if not users:
            return {}

        # 属性を辞書に変換
        attrs = {}
        for attr in users[0].get("Attributes", []):
            attrs[attr["Name"]] = attr["Value"]

        return {
            "email": attrs.get("email", ""),
            "family_name": attrs.get("family_name", ""),
            "given_name": attrs.get("given_name", ""),
        }

    except Exception as e:
        logger.warning(f"Cognito取得失敗: {user_id} - {e}", action_category="ERROR")
        return {}