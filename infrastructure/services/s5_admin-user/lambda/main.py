import os
import json
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 各アクションのハンドラをインポート
from modules import list_users, create_user, get_user, update_user, delete_user

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource('dynamodb')
SESSION_TABLE = os.environ.get('SESSION_TABLE') # ★追加

def create_response(status_code: int, body: dict, origin: str) -> dict:
    """CORS・Cookie対応の共通レスポンス生成"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true" # ★重要
        },
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

def get_session(event):
    """
    Cookie から sessionId を抽出し、DynamoDB からセッション情報を取得します。
    """
    # API Gateway v2 形式では event['cookies'] にリストで入っています
    cookies = event.get('cookies', [])
    session_id = None

    # Cookie リストから sessionId を探す
    for cookie_str in cookies:
        if cookie_str.startswith("sessionId="):
            # "sessionId=abc123xxx" -> "abc123xxx"
            session_id = cookie_str.split("=")[1]
            break

    # セッションIDが見つからない場合は未認証として返す
    if not session_id:
        return None

    try:
        # 環境変数 SESSION_TABLE からテーブルを取得
        # ※ SESSION_TABLE は各 main.tf で設定済み
        table_name = os.environ.get('SESSION_TABLE')
        table = dynamodb.Table(table_name)

        # ★ 修正ポイント:
        # DynamoDB のキー定義に合わせて "session_id" (スネークケース) を使用
        response = table.get_item(
            Key={
                'session_id': session_id
            }
        )

        # 取得できた Item (セッション情報) を返す
        return response.get('Item')

    except Exception as e:
        # 権限不足やキー名の間違いがあるとここでログが出る
        print(f"Session check failed: {str(e)}")
        return None

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    origin = event.headers.get('origin', '')

    # 1. CSRF対策のチェック (JSからのカスタムヘッダーを必須化)
    x_req = (event.headers.get('x-requested-with') or event.headers.get('X-Requested-With') or '').lower()
    if x_req != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, origin)

    # 2. セッション認証 (JWT claims ではなく Cookie 方式へ変更)
    session = get_session(event)
    if not session:
        return create_response(401, {"message": "Unauthorized"}, origin)

    tenant_id = str(session.get("tenant_id"))
    caller_user_id = str(session.get("user_id"))

    # 管理者権限のチェック (実運用上のガードレール)
    if session.get("role") != "admin":
        logger.warning(f"一般ユーザーによる管理操作を拒否しました: {caller_user_id}")
        return create_response(403, {"message": "Access Denied"}, origin)

    logger.append_keys(tenant_id=tenant_id, user_id=caller_user_id)

    # ルーティング情報取得
    http_method = event.request_context.http.method
    path = event.raw_path
    path_params = event.path_parameters or {}

    # ハンドラに渡すコンテキスト (claimsの代わりにsession情報を使用)
    ctx = {
        "tenant_id": tenant_id,
        "caller_user_id": caller_user_id,
        "session": session,
        "origin": origin # create_response用
    }

    logger.info(f"Admin Request: {http_method} {path}", action_category="EXECUTE")

    try:
        # ルーティング (既存のロジックを流用)
        if path == "/admin/users":
            if http_method == "GET":
                return list_users.handle(event, ctx)
            elif http_method == "POST":
                return create_user.handle(event, ctx)

        elif path.startswith("/admin/users/") and path_params.get("user_id"):
            u_id = path_params["user_id"]
            if http_method == "GET":
                return get_user.handle(event, ctx, u_id)
            elif http_method == "PATCH":
                return update_user.handle(event, ctx, u_id)
            elif http_method == "DELETE":
                return delete_user.handle(event, ctx, u_id)

        return create_response(404, {"message": "Not Found"}, origin)

    except Exception:
        logger.exception("Internal error in Admin User module")
        return create_response(500, {"message": "Internal server error"}, origin)