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

def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

def build_tree(flat_items: list) -> list:
    """
    フラットなDynamoDBアイテムリストを階層構造(Tree)に変換する
    """
    node_map = {}
    for item in flat_items:
        node = {
            "id": item.get("nodePath"),
            "name": item.get("name"),
            "type": item.get("type"),
            "data": item,
            "children": []
        }
        node_map[item.get("nodePath")] = node

    root_nodes = []

    for path, node in node_map.items():
        parts = path.split("#")

        if len(parts) <= 2:
            # ルートノード (Department)
            root_nodes.append(node)
        else:
            # 親を探す: 後ろの2要素を削ったパスを作る
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)

            if parent:
                parent["children"].append(node)
            else:
                root_nodes.append(node)

    return root_nodes

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    """
    工事マスタ取得API
    """
    # ★修正: JWTトークンから tenant_id を安全に取得 (s1と同じ対応)
    raw_claims = (
        event.raw_event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    tenant_id = raw_claims.get("custom:tenant_id") or raw_claims.get("tenant_id")

    if not tenant_id:
        logger.warning("Missing tenant_id in token.")
        # デバッグ用にログ出力
        logger.debug(f"Claims: {raw_claims}")
        return create_response(400, {"message": "Invalid token"})

    logger.append_keys(tenant_id=tenant_id)

    # クエリパラメータ取得
    params = event.query_string_parameters or {}
    dept_prefix = params.get("deptId")

    try:
        table = dynamodb.Table(TABLE_NAME)

        key_condition = Key("tenant_id").eq(tenant_id)
        if dept_prefix:
            key_condition = key_condition & Key("nodePath").begins_with(dept_prefix)

        response = table.query(KeyConditionExpression=key_condition)
        items = response.get("Items", [])

        # 階層構造に変換
        tree_data = build_tree(items)

    except ClientError:
        logger.exception("DynamoDB Query Error")
        return create_response(500, {"message": "Database error"})
    except Exception:
        logger.exception("Unexpected error")
        return create_response(500, {"message": "Internal server error"})

    return create_response(200, tree_data)