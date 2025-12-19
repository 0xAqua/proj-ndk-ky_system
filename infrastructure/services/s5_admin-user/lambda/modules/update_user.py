import json
from datetime import datetime
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table

logger = Logger()
tracer = Tracer()

# ★ 修正: CORS対応
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
    """ユーザー更新"""
    tenant_id = ctx["tenant_id"]
    origin = ctx.get("origin", "*") # ★ main.py から渡される origin

    #
    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        logger.warning("JSONパースに失敗しました", action_category="ERROR")
        return create_response(400, {"message": "Invalid JSON"}, origin)

    if not body:
        logger.warning("更新フィールドがありません", action_category="ERROR")
        return create_response(400, {"message": "No update fields provided"}, origin)

    now = datetime.utcnow().isoformat() + "Z"
    logger.info(f"ユーザーを更新します: {user_id}", action_category="EXECUTE")

    try:
        #
        existing = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "user_id": user_id}
        ).get("Item")

        if not existing:
            logger.warning(f"ユーザーが見つかりません: {user_id}", action_category="ERROR")
            return create_response(404, {"message": "User not found"}, origin)

        email = existing.get("email")

        # Cognito の属性更新
        cognito_attrs = []
        if "given_name" in body:
            cognito_attrs.append({"Name": "given_name", "Value": body["given_name"]})
        if "family_name" in body:
            cognito_attrs.append({"Name": "family_name", "Value": body["family_name"]})

        if cognito_attrs:
            cognito.admin_update_user_attributes(
                UserPoolId=USER_POOL_ID, Username=email, UserAttributes=cognito_attrs
            )
            logger.info("Cognito属性更新完了", action_category="EXECUTE")

        # DynamoDB 更新
        update_expr_parts = ["#updated_at = :updated_at"]
        expr_names = {"#updated_at": "updated_at"}
        expr_values = {":updated_at": now}

        allowed_fields = ["family_name", "given_name", "departments", "role", "status"]
        for field in allowed_fields:
            if field in body:
                update_expr_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                expr_values[f":{field}"] = body[field]

        tenant_user_master_table.update_item(
            Key={"tenant_id": tenant_id, "user_id": user_id},
            UpdateExpression="SET " + ", ".join(update_expr_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )

        # ステータス変更の場合のCognito更新ロジック
        if "status" in body:
            new_status = body["status"]
            if new_status in ["INACTIVE", "LOCKED"]:
                cognito.admin_disable_user(UserPoolId=USER_POOL_ID, Username=email)
            elif new_status == "ACTIVE":
                cognito.admin_enable_user(UserPoolId=USER_POOL_ID, Username=email)

        logger.info(f"ユーザー更新完了: {user_id}", action_category="EXECUTE")
        return create_response(200, {"message": "User updated successfully"}, origin)

    except ClientError:
        logger.exception("ユーザー更新に失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Failed to update user"}, origin)