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
    フラットなDynamoDBアイテムリストを、用途別の配列を持つ階層構造(Tree)に変換する
    """
    node_map = {}

    # 1. まず全ノードをマップ化（初期化）
    for item in flat_items:
        node = {
            "id": item.get("nodePath"),
            "title": item.get("title"),  # ★ name -> title に変更
            "children": [],
            "tasks": [],                 # ★ tasks用配列を追加
            "safety_equipments": []      # ★ 安全機材用配列を追加
        }

        # ハイリスクフラグなど、その他の属性も必要ならコピー
        if "is_high_risk" in item:
            node["is_high_risk"] = item["is_high_risk"]

        # デバッグ用や詳細データ用として元データも持たせるなら
        # node["data"] = item

        node_map[item.get("nodePath")] = node

    root_nodes = []

    # 2. 親子関係の構築
    for path, node in node_map.items():
        parts = path.split("#")

        # ルートノード判定 (例: DEPT#1 は要素数2)
        if len(parts) <= 2:
            root_nodes.append(node)
        else:
            # 親を探すロジック (後ろの2要素 #KEY#ID を削る)
            # 例: ...#PROJ#1#TASK#1 -> ...#PROJ#1
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)

            if parent:
                # ★ IDによって格納先を振り分けるロジック
                if "TASK" in parts[-2]:  # IDの最後から2番目が TASK か判定
                    parent["tasks"].append(node)
                elif "SEQ" in parts[-2]:  # IDの最後から2番目が SEQ か判定
                    parent["safety_equipments"].append(node)
                else:
                    parent["children"].append(node)
            else:
                # 親が見つからない場合はルート扱い（念のため）
                root_nodes.append(node)

    # (オプション) 配列をID順などでソートしたい場合はここで各ノードに対してsortを行う

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
        logger.warning("トークンにtenant_idがありません", action_category="ERROR")
        # デバッグ用にログ出力
        logger.debug("受信したclaims", action_category="EXECUTE", claims=raw_claims)
        return create_response(400, {"message": "Invalid token"})

    logger.append_keys(tenant_id=tenant_id)

    # クエリパラメータ取得
    params = event.query_string_parameters or {}
    dept_prefix = params.get("deptId")

    logger.info("工事マスタを取得します", action_category="EXECUTE", dept_prefix=dept_prefix)

    try:
        table = dynamodb.Table(TABLE_NAME)

        key_condition = Key("tenant_id").eq(tenant_id)
        if dept_prefix:
            key_condition = key_condition & Key("nodePath").begins_with(dept_prefix)

        response = table.query(KeyConditionExpression=key_condition)
        items = response.get("Items", [])

        # 階層構造に変換
        tree_data = build_tree(items)

        logger.info("工事マスタを取得しました", action_category="EXECUTE", item_count=len(items))

    except ClientError:
        logger.exception("DynamoDBクエリに失敗しました", action_category="ERROR")
        return create_response(500, {"message": "Database error"})
    except Exception:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        return create_response(500, {"message": "Internal server error"})

    return create_response(200, tree_data)