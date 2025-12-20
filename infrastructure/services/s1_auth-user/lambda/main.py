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
SESSION_TABLE = os.environ.get("SESSION_TABLE")  # ★追加: セッションテーブル
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")  # ★追加: CORS用


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
        hashed_id = hash_session_id(session_id)  # ← 追加
        response = session_table.get_item(Key={"session_id": hashed_id})  # ← 修正
        item = response.get("Item")

        # 期限チェック
        if item and item.get("expires_at", 0) > int(time.time()):
            return item
        return None
    except ClientError as e:
        logger.exception("セッション取得エラー", error=str(e))
        return None


def decode_id_token(id_token: str) -> dict:
    """IDトークンからユーザー情報を取得"""
    try:
        payload = id_token.split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        decoded = base64.b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        logger.error("トークンデコードエラー", error=str(e))
        return {}


@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):

    # ★ CORS用ヘッダー取得
    headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    origin = headers.get("origin", "")
    cors_headers = get_cors_headers(origin)

    # 1. 環境変数のチェック
    if not TABLE_NAME:
        logger.error("環境変数 'TENANT_USER_MASTER_TABLE_NAME' が設定されていません")
        return create_response(500, {"message": "Server configuration error"}, cors_headers)

    if not SESSION_TABLE:
        logger.error("環境変数 'SESSION_TABLE' が設定されていません")
        return create_response(500, {"message": "Server configuration error"}, cors_headers)

    # 2. ★修正: CookieからセッションIDを取得
    session_id = get_session_from_cookie(event)
    if not session_id:
        logger.warning("セッションIDがありません")
        return create_response(401, {"message": "認証が必要です"}, cors_headers)

    # 3. ★修正: DynamoDBからセッション情報を取得
    session = get_session(session_id)
    if not session:
        logger.warning("セッションが無効または期限切れです", session_id=session_id[:8])
        return create_response(401, {"message": "セッションが無効です"}, cors_headers)

    # 4. ★修正: セッションからユーザー情報を取得
    tenant_id = session.get("tenant_id")
    user_id = session.get("user_id")

    # ログにテナントID等を付与
    logger.append_keys(tenant_id=tenant_id, user_id=user_id)

    if not tenant_id or not user_id:
        logger.warning("セッションにtenant_idまたはuser_idがありません")
        return create_response(400, {"message": "Invalid session data"}, cors_headers)

    logger.info("テナントユーザー情報を取得します", action_category="EXECUTE")

    # 5. DynamoDBからテナントユーザー情報を取得
    try:
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "user_id": user_id,
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

    # 3. レスポンスボディの構築（必要なものだけに絞り込む）
    response_body = {
        "tenantId": tenant_id,
        "userId": user_id,
        "tenantUser": {
            "departments": user_item.get("departments", {}), # 必須データ
            "role": user_item.get("role"),
            "status": user_item.get("status")
        }
    }

    return create_response(200, response_body, cors_headers)