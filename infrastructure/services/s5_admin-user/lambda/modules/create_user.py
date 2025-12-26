import json
import os
from datetime import datetime, timezone
from aws_lambda_powertools import Logger, Tracer
from botocore.exceptions import ClientError
from .cognito_client import cognito, USER_POOL_ID, tenant_user_master_table
from shared.operation_logger import log_user_created  # ★ 追加

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
    """ユーザー新規作成（Cognito + DynamoDB）"""
    tenant_id = ctx["tenant_id"]
    caller_email = ctx["caller_email"]
    origin = ctx.get("origin", "*")
    ip_address = ctx.get("ip_address", "")  # ★ 追加

    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        return create_response(400, {"message": "Invalid JSON"}, origin)

    required = ["email", "password"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        return create_response(400, {"message": f"Missing fields: {missing}"}, origin)

    email = body["email"]
    password = body["password"]
    role = body.get("role", "user")

    departments = body.get("departments", {})
    departments["DEPT#1"] = "共通"

    now_iso = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    logger.info(f"ユーザー作成を開始: {email}", action_category="EXECUTE")

    try:
        # 1. Cognito にユーザー作成
        response = cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "custom:tenant_id", "Value": tenant_id},
            ],
            MessageAction="SUPPRESS"
        )

        # 2. パスワードを永続設定
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True
        )

        # 3. DynamoDB に登録
        user_item = {
            "tenant_id": tenant_id,
            "email": email,
            "departments": departments,
            "role": role,
            "status": "ACTIVE",
            "version": 1,
            "created_at": now_iso,
            "updated_at": now_iso,
            "status_changed_at": now_iso,
            "status_changed_by": caller_email
        }

        tenant_user_master_table.put_item(Item=user_item)

        # ★ 操作履歴を記録
        log_user_created(
            tenant_id=tenant_id,
            email=caller_email,
            target_email=email,
            role=role,
            ip_address=ip_address
        )

        logger.info(f"ユーザー作成完了: {email}", action_category="EXECUTE")
        return create_response(201, {
            "message": "User created successfully",
            "user": user_item
        }, origin)

    except cognito.exceptions.UsernameExistsException:
        return create_response(409, {"message": "このメールアドレスは既に登録されています"}, origin)

    except Exception as e:
        logger.exception("ユーザー作成に失敗しました。ロールバックを実行します。")
        _rollback_cognito_user(email)
        return create_response(500, {"message": "Internal error during user creation"}, origin)

def _rollback_cognito_user(email: str):
    """DynamoDB書き込み失敗時などにCognitoユーザーを削除して整合性を保つ"""
    try:
        cognito.admin_delete_user(UserPoolId=USER_POOL_ID, Username=email)
        logger.info(f"ロールバック成功: {email}")
    except Exception as e:
        logger.error(f"ロールバック失敗 (手動削除が必要です): {email}, Error: {str(e)}")