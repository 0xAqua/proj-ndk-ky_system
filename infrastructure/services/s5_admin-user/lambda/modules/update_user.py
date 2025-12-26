import json
import os
from datetime import datetime, timezone
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table
from shared.operation_logger import log_user_updated  # ★ 追加

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
    """ユーザー更新 (Cognito + DynamoDB 同期)"""
    tenant_id = ctx["tenant_id"]
    caller_email = ctx["caller_email"]
    origin = ctx.get("origin", "*")
    ip_address = ctx.get("ip_address", "")  # ★ 追加

    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        return create_response(400, {"message": "Invalid JSON"}, origin)

    if not body:
        return create_response(400, {"message": "No update fields provided"}, origin)

    now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    logger.info(f"ユーザー更新処理開始: {email}")

    try:
        # 1. 現在のデータを取得
        existing_resp = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "email": email}
        )
        existing = existing_resp.get("Item")

        if not existing:
            return create_response(404, {"message": "User not found"}, origin)

        # 2. Cognito ステータス制御 (有効化・無効化)
        if "status" in body:
            new_status = body["status"]
            if new_status in ["INACTIVE", "LOCKED"]:
                cognito.admin_disable_user(UserPoolId=USER_POOL_ID, Username=email)
            elif new_status == "ACTIVE":
                cognito.admin_enable_user(UserPoolId=USER_POOL_ID, Username=email)

        # 3. DynamoDB 更新クエリの組み立て
        update_expr_parts = ["updated_at = :now", "version = if_not_exists(version, :zero) + :inc"]
        expr_names = {}
        expr_values = {
            ":now": now_iso,
            ":inc": 1,
            ":zero": 0
        }

        # ★ 変更内容を記録用に保持
        changes = {}

        allowed_fields = ["departments", "role", "status"]
        for field in allowed_fields:
            if field in body:
                update_expr_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                expr_values[f":{field}"] = body[field]

                # ★ 変更内容を記録
                changes[field] = {
                    "from": existing.get(field),
                    "to": body[field]
                }

                if field == "status":
                    update_expr_parts.append("status_changed_at = :now")
                    update_expr_parts.append("status_changed_by = :by")
                    expr_values[":by"] = caller_email

        # クエリ実行
        tenant_user_master_table.update_item(
            Key={"tenant_id": tenant_id, "email": email},
            UpdateExpression="SET " + ", ".join(update_expr_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ConditionExpression="attribute_exists(email)"
        )

        # ★ 操作履歴を記録
        log_user_updated(
            tenant_id=tenant_id,
            email=caller_email,
            target_email=email,
            changes=changes,
            ip_address=ip_address
        )

        logger.info(f"ユーザー更新完了: {email}")
        return create_response(200, {"message": "User updated successfully"}, origin)

    except cognito.exceptions.UserNotFoundException:
        return create_response(404, {"message": "Cognito user not found"}, origin)
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return create_response(404, {"message": "User not found or access denied"}, origin)
        logger.exception("Database update error")
        return create_response(500, {"message": "Database update error"}, origin)
    except Exception:
        logger.exception("Internal error")
        return create_response(500, {"message": "Internal error"}, origin)