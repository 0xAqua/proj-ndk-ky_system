import json
import os
from datetime import datetime, timezone
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
    """ユーザー更新 (Cognito + DynamoDB 同期)"""
    tenant_id = ctx["tenant_id"]
    caller_user_id = ctx["caller_user_id"] # 操作を行った管理者のID
    origin = ctx.get("origin", "*")

    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        return create_response(400, {"message": "Invalid JSON"}, origin)

    if not body:
        return create_response(400, {"message": "No update fields provided"}, origin)

    # タイムスタンプ生成
    now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    logger.info(f"ユーザー更新処理開始: {user_id}")

    try:
        # 1. 現在のデータを取得（Cognito連携に必要な情報の確認）
        existing_resp = tenant_user_master_table.get_item(
            Key={"tenant_id": tenant_id, "user_id": user_id}
        )
        existing = existing_resp.get("Item")

        if not existing:
            return create_response(404, {"message": "User not found"}, origin)

        email = existing["email"]

        # 2. Cognito 属性の更新 (氏名変更がある場合)
        cognito_attrs = []
        if "given_name" in body:
            cognito_attrs.append({"Name": "given_name", "Value": body["given_name"]})
        if "family_name" in body:
            cognito_attrs.append({"Name": "family_name", "Value": body["family_name"]})

        if cognito_attrs:
            cognito.admin_update_user_attributes(
                UserPoolId=USER_POOL_ID, Username=email, UserAttributes=cognito_attrs
            )

        # 3. Cognito ステータス制御 (有効化・無効化)
        if "status" in body:
            new_status = body["status"]
            if new_status in ["INACTIVE", "LOCKED"]:
                cognito.admin_disable_user(UserPoolId=USER_POOL_ID, Username=email)
            elif new_status == "ACTIVE":
                cognito.admin_enable_user(UserPoolId=USER_POOL_ID, Username=email)

        # 4. DynamoDB 更新クエリの組み立て
        # versionが未定義の場合を考慮して if_not_exists を使用
        update_expr_parts = ["updated_at = :now", "version = if_not_exists(version, :zero) + :inc"]
        expr_names = {}
        expr_values = {
            ":now": now_iso,
            ":inc": 1,
            ":zero": 0  # 初期値用
        }

        # 更新を許可するフィールドのループ
        allowed_fields = ["family_name", "given_name", "departments", "role", "status"]
        for field in allowed_fields:
            if field in body:
                update_expr_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                expr_values[f":{field}"] = body[field]

                # ステータス変更時は監査項目も追加
                if field == "status":
                    update_expr_parts.append("status_changed_at = :now")
                    update_expr_parts.append("status_changed_by = :by")
                    expr_values[":by"] = caller_user_id

        # クエリ実行
        tenant_user_master_table.update_item(
            Key={"tenant_id": tenant_id, "user_id": user_id},
            UpdateExpression="SET " + ", ".join(update_expr_parts), # SET をここで結合
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ConditionExpression="attribute_exists(user_id)"
        )

        logger.info(f"ユーザー更新完了: {user_id}")
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