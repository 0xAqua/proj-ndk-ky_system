import os
import json
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("CONSTRUCTION_MASTER_TABLE_NAME")
SESSION_TABLE = os.environ.get("SESSION_TABLE_NAME") # ★追加: セッション管理テーブル

def create_response(status_code: int, body: dict, cors_headers: dict = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if cors_headers:
        headers.update(cors_headers)
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

def get_session(event: APIGatewayProxyEventV2):
    """Cookie からセッション情報を取得"""
    cookies = event.cookies or []
    session_id = None
    for c in cookies:
        if c.startswith("sessionId="):
            session_id = c.split("=")[1]
            break

    if not session_id:
        return None

    try:
        # セッションテーブルから情報を取得
        table = dynamodb.Table(SESSION_TABLE)
        res = table.get_item(Key={"sessionId": session_id})
        return res.get("Item")
    except Exception as e:
        logger.error(f"Session check failed: {e}")
        return None

def build_tree(flat_items: list) -> list:
    # ... (既存の build_tree ロジックはそのまま使用) ...
    node_map = {}
    for item in flat_items:
        node = {
            "id": item.get("nodePath"),
            "title": item.get("title"),
            "children": [],
            "tasks": [],
            "safety_equipments": []
        }
        if "is_high_risk" in item:
            node["is_high_risk"] = item["is_high_risk"]
        node_map[item.get("nodePath")] = node

    root_nodes = []
    for path, node in node_map.items():
        parts = path.split("#")
        if len(parts) <= 2:
            root_nodes.append(node)
        else:
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)
            if parent:
                if "TASK" in parts[-2]:
                    parent["tasks"].append(node)
                elif "SEQ" in parts[-2]:
                    parent["safety_equipments"].append(node)
                else:
                    parent["children"].append(node)
            else:
                root_nodes.append(node)
    return root_nodes

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    origin = event.headers.get('origin', '')
    # CORSヘッダー (必要に応じて get_cors_headers 関数などから取得)
    cors_headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true"
    }

    # 1. CSRF対策のチェック
    x_req = (event.headers.get('x-requested-with') or event.headers.get('X-Requested-With') or '').lower()
    if x_req != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, cors_headers)

    # 2. セッション認証 (JWT から Cookie 方式へ変更)
    session = get_session(event)
    if not session:
        return create_response(401, {"message": "Unauthorized"}, cors_headers)

    tenant_id = session.get("tenant_id")
    logger.append_keys(tenant_id=tenant_id)

    # 3. マスタ取得処理
    params = event.query_string_parameters or {}
    dept_prefix = params.get("deptId")

    try:
        table = dynamodb.Table(TABLE_NAME)
        key_condition = Key("tenant_id").eq(tenant_id)
        if dept_prefix:
            key_condition = key_condition & Key("nodePath").begins_with(dept_prefix)

        response = table.query(KeyConditionExpression=key_condition)
        tree_data = build_tree(response.get("Items", []))

        return create_response(200, tree_data, cors_headers)

    except Exception as e:
        logger.exception("Internal error")
        return create_response(500, {"message": "Internal server error"}, cors_headers)