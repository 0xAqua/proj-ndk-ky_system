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
    # 1. 検索しやすいように辞書化 & 子供リストの初期化
    # key: nodePath, value: item (with children)
    node_map = {}
    for item in flat_items:
        # フロントエンドで使いやすいようにキー名を整理してもOK
        node = {
            "id": item.get("nodePath"),
            "name": item.get("name"),
            "type": item.get("type"), # Department, Task 等
            "data": item,             # 元データも一応残しておく
            "children": []
        }
        node_map[item.get("nodePath")] = node

    root_nodes = []

    # 2. 親子関係の紐付け
    # nodePath例: DEPT#1#TYPE#1 -> 親は DEPT#1
    # ロジック: 後ろのタグ(#AAA#1)を1つ消したものが親のパス
    for path, node in node_map.items():
        # パスを分解 (例: "DEPT#1#TYPE#1" -> ["DEPT#1", "TYPE#1"])
        parts = path.split("#")

        # 親がいるか判定 (要素数が2以上なら親がいる可能性がある)
        # DEPT#1 (len=2) -> 親なし(Root)
        # DEPT#1#TYPE#1 (len=4) -> 親は DEPT#1
        # ※ あなたの定義 "DEPT#1" は "#" で分割すると ["DEPT", "1"] (len=2)
        #    "DEPT#1#TYPE#1" は ["DEPT", "1", "TYPE", "1"] (len=4)

        if len(parts) <= 2:
            # ルートノード (Department)
            root_nodes.append(node)
        else:
            # 親を探す: 後ろの2要素("TYPE", "1")を削ったパスを作る
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)

            if parent:
                parent["children"].append(node)
            else:
                # 親が見つからない場合は孤立ノードとしてルート扱いにしても良いし、無視しても良い
                # ここではルートに入れておく（データ不整合対策）
                root_nodes.append(node)

    return root_nodes

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    """
    工事マスタ取得API (階層構造JSON返却版)
    """
    if not event.request_context.authorizer.jwt:
        return create_response(401, {"message": "Unauthorized"})

    claims = event.request_context.authorizer.jwt.claims
    tenant_id = claims.get("custom:tenant_id") or claims.get("tenant_id")

    logger.append_keys(tenant_id=tenant_id)

    # クエリパラメータ取得
    params = event.query_string_parameters or {}
    dept_prefix = params.get("deptId") # 指定がなければ全件

    try:
        table = dynamodb.Table(TABLE_NAME)

        key_condition = Key("tenant_id").eq(tenant_id)
        if dept_prefix:
            key_condition = key_condition & Key("nodePath").begins_with(dept_prefix)

        response = table.query(KeyConditionExpression=key_condition)
        items = response.get("Items", [])

        # ★ここで変換処理を実行
        tree_data = build_tree(items)

    except ClientError:
        logger.exception("DynamoDB Query Error")
        return create_response(500, {"message": "Database error"})
    except Exception:
        logger.exception("Unexpected error")
        return create_response(500, {"message": "Internal server error"})

    return create_response(200, tree_data) # リストをそのまま返す