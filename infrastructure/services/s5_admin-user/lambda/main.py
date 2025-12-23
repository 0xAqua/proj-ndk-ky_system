import os
import json
import boto3
import hashlib
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext
from urllib.parse import unquote  # ← 追加: URLエンコードされたemailのデコード用

# 各アクションのハンドラをインポート
from modules import list_users, create_user, get_user, update_user, delete_user

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource('dynamodb')
SESSION_TABLE = os.environ.get('SESSION_TABLE')

def create_response(status_code: int, body: dict, origin: str) -> dict:
    """CORS・Cookie対応の共通レスポンス生成"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()

def get_session(event):
    """
    Cookie から sessionId を抽出し、DynamoDB からセッション情報を取得します。
    """
    cookies = event.get('cookies', [])
    session_id = None

    for cookie_str in cookies:
        if cookie_str.startswith("sessionId="):
            session_id = cookie_str.split("=")[1]
            break

    if not session_id:
        return None

    hashed_id = hash_session_id(session_id)

    try:
        table_name = os.environ.get('SESSION_TABLE')
        table = dynamodb.Table(table_name)

        response = table.get_item(
            Key={
                'session_id': hashed_id
            }
        )

        return response.get('Item')

    except Exception as e:
        logger.error(f"Session check failed: {str(e)}")
        return None

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    raw_headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    expected = os.environ.get("ORIGIN_VERIFY_SECRET")

    if expected and raw_headers.get("x-origin-verify") != expected:
        return {"statusCode": 403, "body": "Forbidden"}

    origin = event.headers.get('origin', '')

    # 1. CSRF対策のチェック
    x_req = (event.headers.get('x-requested-with') or event.headers.get('X-Requested-With') or '').lower()
    if x_req != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, origin)

    # 2. セッション認証
    session = get_session(event)
    if not session:
        return create_response(401, {"message": "Unauthorized"}, origin)

    tenant_id = str(session.get("tenant_id"))
    caller_email = str(session.get("email"))  # ← 変更

    # 管理者権限のチェック
    if session.get("role") != "admin":
        logger.warning(f"一般ユーザーによる管理操作を拒否しました: {caller_email}")  # ← 変更
        return create_response(403, {"message": "Access Denied"}, origin)

    logger.append_keys(tenant_id=tenant_id, email=caller_email)  # ← 変更

    # ルーティング情報取得
    http_method = event.request_context.http.method
    path = event.raw_path
    path_params = event.path_parameters or {}

    # ハンドラに渡すコンテキスト
    ctx = {
        "tenant_id": tenant_id,
        "caller_email": caller_email,  # ← 変更
        "session": session,
        "origin": origin
    }

    logger.info(f"Admin Request: {http_method} {path}", action_category="EXECUTE")

    try:
        # ルーティング
        if path == "/admin/users":
            if http_method == "GET":
                return list_users.handle(event, ctx)
            elif http_method == "POST":
                return create_user.handle(event, ctx)

        elif path.startswith("/admin/users/") and path_params.get("email"):  # ← 変更
            # URLエンコードされたemailをデコード（例: test%40example.com → test@example.com）
            target_email = unquote(path_params["email"])  # ← 変更
            if http_method == "GET":
                return get_user.handle(event, ctx, target_email)  # ← 変更
            elif http_method == "PATCH":
                return update_user.handle(event, ctx, target_email)  # ← 変更
            elif http_method == "DELETE":
                return delete_user.handle(event, ctx, target_email)  # ← 変更

        return create_response(404, {"message": "Not Found"}, origin)

    except Exception:
        logger.exception("Internal error in Admin User module")
        return create_response(500, {"message": "Internal server error"}, origin)