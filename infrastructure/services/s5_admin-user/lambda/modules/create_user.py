import json
import uuid
from datetime import datetime
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
    """ユーザー新規作成（Cognito + DynamoDB）"""
    tenant_id = ctx["tenant_id"]

    # リクエストボディ取得
    try:
        body = json.loads(event.body) if event.body else {}
    except json.JSONDecodeError:
        logger.warning("JSONパースに失敗しました", action_category="ERROR")
        return create_response(400, {"message": "Invalid JSON"})

    # バリデーション
    required = ["email", "password", "family_name", "given_name"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        logger.warning(f"必須フィールドがありません: {missing}", action_category="ERROR")
        return create_response(400, {"message": f"Missing fields: {missing}"})

    email = body["email"]
    password = body["password"]
    family_name = body["family_name"]
    given_name = body["given_name"]
    departments = body.get("departments", {})
    role = body.get("role", "viewer")

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"

    logger.info(f"ユーザーを作成します: {email}", action_category="EXECUTE")

    try:
        # 1. Cognito にユーザー作成（メール送信を抑制）
        cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "given_name", "Value": given_name},
                {"Name": "family_name", "Value": family_name},
                {"Name": "custom:tenant_id", "Value": tenant_id},
            ],
            MessageAction="SUPPRESS"
        )

        logger.info("Cognitoへのユーザー登録完了", action_category="EXECUTE")

        # 2. パスワードを即座に設定
        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True
        )

        logger.info("パスワード設定完了", action_category="EXECUTE")

        # 3. DynamoDB にユーザー情報を登録
        tenant_user_master_table.put_item(Item={
            "tenant_id": tenant_id,
            "user_id": user_id,
            "email": email,
            "family_name": family_name,
            "given_name": given_name,
            "departments": departments,
            "role": role,
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now
        })

        logger.info(f"ユーザー作成完了: {email} ({user_id})", action_category="EXECUTE")

        return create_response(201, {
            "message": "User created successfully",
            "user_id": user_id,
            "email": email
        })

    except cognito.exceptions.UsernameExistsException:
        logger.warning(f"ユーザーは既に存在します: {email}", action_category="ERROR")
        return create_response(409, {"message": "User already exists"})

    except ClientError as e:
        logger.exception("ユーザー作成に失敗しました", action_category="ERROR")
        # ロールバック
        _rollback_cognito_user(email)
        return create_response(500, {"message": "Failed to create user"})

    except Exception:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        _rollback_cognito_user(email)
        return create_response(500, {"message": "Internal server error"})


def _rollback_cognito_user(email: str):
    """ロールバック: Cognitoユーザー削除"""
    try:
        cognito.admin_delete_user(
            UserPoolId=USER_POOL_ID,
            Username=email
        )
        logger.info(f"ロールバック完了: Cognitoユーザー削除 ({email})", action_category="EXECUTE")
    except Exception:
        logger.warning(f"ロールバック失敗: {email}", action_category="ERROR")