import os
import json
import time
import base64
import boto3
from botocore.exceptions import ClientError
import hashlib

# Powertoolsのインポート
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 1. サービスの初期化
logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TENANT_USER_MASTER_TABLE_NAME")
SESSION_TABLE = os.environ.get("SESSION_TABLE")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")


def create_response(status_code: int, body: dict, cors_headers: dict = None) -> dict:
    """レスポンス生成"""
    headers = {"Content-Type": "application/json"}
    if cors_headers:
        headers.update(cors_headers)
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }


def get_cors_headers(origin: str) -> dict:
    """CORS用ヘッダー"""
    if origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "application/json"
        }
    return {"Content-Type": "application/json"}


def get_session_from_cookie(event: APIGatewayProxyEventV2) -> str | None:
    """CookieからセッションIDを取得"""
    raw_cookies = event.raw_event.get("cookies", [])
    for c in raw_cookies:
        if c.startswith("sessionId="):
            return c.split("=")[1]
    return None


def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()


def get_session(session_id: str) -> dict | None:
    """DynamoDBからセッション情報を取得"""
    if not SESSION_TABLE:
        logger.error("SESSION_TABLE環境変数が未設定です")
        return None

    try:
        session_table = dynamodb.Table(SESSION_TABLE)
        hashed_id = hash_session_id(session_id)
        response = session_table.get_item(Key={"session_id": hashed_id})
        item = response.get("Item")

        # 期限チェック
        if item and item.get("expires_at", 0) > int(time.time()):
            return item
        return None
    except ClientError as e:
        logger.exception("セッション取得エラー", error=str(e))
        return None


@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    # CloudFront経由かチェック
    raw_headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    expected = os.environ.get("ORIGIN_VERIFY_SECRET")

    if expected and raw_headers.get("x-origin-verify") != expected:
        logger.warning("不正なアクセス: Origin Verify失敗")
        return {"statusCode": 403, "body": "Forbidden"}

    # CORS用ヘッダー取得
    origin = raw_headers.get("origin", "")
    cors_headers = get_cors_headers(origin)

    x_req = raw_headers.get('x-requested-with', '')
    if x_req.lower() != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, cors_headers)

    # 1. 環境変数のチェック
    if not TABLE_NAME:
        logger.error("環境変数 'TENANT_USER_MASTER_TABLE_NAME' が設定されていません")
        return create_response(500, {"message": "Server configuration error"}, cors_headers)

    if not SESSION_TABLE:
        logger.error("環境変数 'SESSION_TABLE' が設定されていません")
        return create_response(500, {"message": "Server configuration error"}, cors_headers)

    # 2. CookieからセッションIDを取得
    session_id = get_session_from_cookie(event)
    if not session_id:
        logger.warning("セッションIDがありません")
        return create_response(401, {"message": "認証が必要です"}, cors_headers)

    # 3. DynamoDBからセッション情報を取得
    session = get_session(session_id)
    if not session:
        logger.warning("セッションが無効または期限切れです", session_id=session_id[:8])
        return create_response(401, {"message": "セッションが無効です"}, cors_headers)

    # 4. セッションからユーザー情報を取得（emailベース）
    tenant_id = session.get("tenant_id")
    email = session.get("email")

    # ログにテナントID等を付与
    logger.append_keys(tenant_id=tenant_id, email=email)

    if not tenant_id or not email:
        logger.warning("セッションにtenant_idまたはemailがありません")
        return create_response(400, {"message": "Invalid session data"}, cors_headers)

    logger.info("テナントユーザー情報を取得します", action_category="EXECUTE")

    # 5. DynamoDBからテナントユーザー情報を取得（キー: tenant_id + email）
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "email": email,
            }
        )
    except ClientError:
        logger.exception("DynamoDBアクセスに失敗しました")
        return create_response(500, {"message": "Database access error"}, cors_headers)
    except Exception:
        logger.exception("予期しないエラーが発生しました")
        return create_response(500, {"message": "Internal server error"}, cors_headers)

    # 6. レスポンス返却
    user_item = response.get("Item") or {}

    logger.info("テナントユーザー情報を取得しました", action_category="EXECUTE")

    # レスポンスボディの構築
    response_body = {
        "tenantId": tenant_id,
        "email": email,
        "tenantUser": {
            "departments": user_item.get("departments", {}),
            "role": user_item.get("role"),
            "status": user_item.get("status")
        }
    }

    return create_response(200, response_body, cors_headers)