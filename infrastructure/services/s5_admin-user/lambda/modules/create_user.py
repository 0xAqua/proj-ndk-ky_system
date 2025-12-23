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
def handle(event, ctx):
    """ユーザー新規作成（Cognito + DynamoDB）"""
    tenant_id = ctx["tenant_id"]
    caller_email = ctx["caller_email"]  # ← 変更: 操作を行っている管理者のemail
    origin = ctx.get("origin", "*")

    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        return create_response(400, {"message": "Invalid JSON"}, origin)

    # 必須バリデーション（emailとpasswordのみ）
    required = ["email", "password"]  # ← 変更: family_name, given_name を削除
    missing = [f for f in required if not body.get(f)]
    if missing:
        return create_response(400, {"message": f"Missing fields: {missing}"}, origin)

    email = body["email"]
    password = body["password"]
    role = body.get("role", "user")

    # 部署情報の整形
    departments = body.get("departments", {})
    departments["DEPT#1"] = "共通"

    # タイムスタンプ生成 (ISO8601形式で統一)
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
            ],  # ← 変更: family_name, given_name を削除
            MessageAction="SUPPRESS"
        )

        # 2. パスワードを永続設定
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True
        )

        # 3. DynamoDB に登録（キー: tenant_id + email）
        user_item = {
            "tenant_id": tenant_id,
            "email": email,  # ← 変更: user_id を削除、email がキー
            "departments": departments,
            "role": role,
            "status": "ACTIVE",
            "version": 1,
            "created_at": now_iso,
            "updated_at": now_iso,
            "status_changed_at": now_iso,
            "status_changed_by": caller_email  # ← 変更
        }

        tenant_user_master_table.put_item(Item=user_item)

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