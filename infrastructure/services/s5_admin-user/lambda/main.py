import os
import json
import boto3
from botocore.exceptions import ClientError

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

from modules import list_users, create_user, get_user, update_user, delete_user

# サービスの初期化
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


@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):

    # JWTからテナント情報を取得
    raw_claims = (
        event.raw_event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    tenant_id = raw_claims.get("custom:tenant_id") or raw_claims.get("tenant_id")
    caller_user_id = raw_claims.get("sub")

    # ログにテナントID等を付与
    logger.append_keys(tenant_id=tenant_id, user_id=caller_user_id)

    if not tenant_id or not caller_user_id:
        logger.warning("トークンにtenant_idまたはuser_idがありません", action_category="ERROR")
        logger.debug("受信したclaims", action_category="EXECUTE", claims=raw_claims)
        return create_response(400, {"message": "Invalid token claims"})

    # ルーティング情報取得
    http_method = event.request_context.http.method
    path = event.raw_path
    path_params = event.path_parameters or {}

    # コンテキスト情報を作成
    ctx = {
        "tenant_id": tenant_id,
        "caller_user_id": caller_user_id,
        "claims": raw_claims
    }

    logger.info(f"リクエスト受信: {http_method} {path}", action_category="EXECUTE")

    try:
        # ルーティング
        if path == "/admin/users":
            if http_method == "GET":
                return list_users.handle(event, ctx)
            elif http_method == "POST":
                return create_user.handle(event, ctx)

        elif path.startswith("/admin/users/") and path_params.get("user_id"):
            user_id = path_params["user_id"]
            if http_method == "GET":
                return get_user.handle(event, ctx, user_id)
            elif http_method == "PATCH":
                return update_user.handle(event, ctx, user_id)
            elif http_method == "DELETE":
                return delete_user.handle(event, ctx, user_id)

        logger.warning(f"ルートが見つかりません: {http_method} {path}", action_category="ERROR")
        return create_response(404, {"message": "Not Found"})

    except Exception:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        return create_response(500, {"message": "Internal server error"})