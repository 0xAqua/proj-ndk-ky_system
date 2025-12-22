import os
import json
import base64
from decimal import Decimal
import boto3
import hashlib
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["TENANT_VQ_MANAGER_TABLE"]
SESSION_TABLE = os.environ.get("SESSION_TABLE") # ★追加

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_response(status_code: int, body: dict, origin: str) -> dict:
    """共通レスポンス生成（CORS/Cookie対応）"""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true" # ★ブラウザのCookie受取に必須
        },
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False)
    }

def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()

def get_session(event):
    cookies = event.get('cookies', [])
    session_id = None

    for cookie_str in cookies:
        if cookie_str.startswith("sessionId="):
            session_id = cookie_str.split("=")[1]
            break

    if not session_id:
        return None

    # ★ ハッシュ化してから検索
    hashed_id = hash_session_id(session_id)

    try:
        table_name = os.environ.get('SESSION_TABLE')
        table = dynamodb.Table(table_name)

        response = table.get_item(
            Key={
                'session_id': hashed_id  # ★ 修正
            }
        )

        return response.get('Item')

    except Exception as e:
        print(f"Session check failed: {str(e)}")
        return None


FACT_LABEL = "過去に起きたインシデント"
AI_LABEL = "推測されるインシデント"

def filter_and_transform_job(item: dict) -> dict | None:
    # 一覧は completed のみ
    if item.get("status") != "COMPLETED":
        return None

    reply = item.get("reply")
    if not reply:
        return None

    if isinstance(reply, str):
        try:
            reply = json.loads(reply)
        except json.JSONDecodeError:
            return None

    incidents = (reply or {}).get("incidents", [])
    if not incidents:
        return None

    if any(not (i.get("classification")) for i in incidents):
        return None

    fact_count = sum(1 for i in incidents if i.get("classification") == FACT_LABEL)
    ai_count = len(incidents) - fact_count

    return {
        "job_id": item.get("job_id"),
        "created_at": item.get("created_at"),
        "family_name": item.get("family_name"),
        "given_name": item.get("given_name"),
        "type_names": item.get("type_names", []),
        "fact_incident_count": fact_count,
        "ai_incident_count": ai_count,
    }



@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    origin = event.headers.get('origin', '')

    # 1. CSRF対策チェック
    x_req = (event.headers.get('x-requested-with') or event.headers.get('X-Requested-With') or '').lower()
    if x_req != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, origin)

    # 2. セッション認証 (JWTからCookie方式へ)
    session = get_session(event)
    if not session:
        return create_response(401, {"message": "Unauthorized"}, origin)

    tenant_id = str(session.get("tenant_id"))
    logger.append_keys(tenant_id=tenant_id)

    try:
        # 3. クエリパラメータとページネーションの処理 (既存通り)
        query_params = event.query_string_parameters or {}
        limit = min(max(int(query_params.get("limit", 20)), 1), 100)

        exclusive_start_key = None
        last_key_str = query_params.get("last_evaluated_key")
        if last_key_str:
            try:
                exclusive_start_key = json.loads(base64.b64decode(last_key_str).decode("utf-8"))
            except Exception: pass

        # 4. DynamoDB Query
        table = dynamodb.Table(TABLE_NAME)
        query_args = {
            "IndexName": "TenantDateIndex",
            "KeyConditionExpression": boto3.dynamodb.conditions.Key("tenant_id").eq(tenant_id),
            "ScanIndexForward": False,
            "Limit": limit
        }
        if exclusive_start_key: query_args["ExclusiveStartKey"] = exclusive_start_key

        response = table.query(**query_args)
        items = response.get("Items", [])

        # 5. フィルタリング
        jobs = [f for f in (filter_and_transform_job(i) for i in items) if f]

        result = {"jobs": jobs}
        lek = response.get("LastEvaluatedKey")
        if lek:
            result["last_evaluated_key"] = base64.b64encode(json.dumps(lek, cls=DecimalEncoder).encode("utf-8")).decode("utf-8")

        return create_response(200, result, origin)

    except Exception:
        logger.exception("Internal error")
        return create_response(500, {"message": "Internal error"}, origin)