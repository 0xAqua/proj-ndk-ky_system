import os
import json
import time
import boto3
import hashlib
from typing import Dict, List, Optional
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# Powertoolsのインポート
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 1. サービスの初期化
logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
USER_TABLE = os.environ.get("TENANT_USER_MASTER_TABLE_NAME")
CONSTRUCTION_TABLE = os.environ.get("CONSTRUCTION_MASTER_TABLE_NAME") # 追加
SESSION_TABLE = os.environ.get("SESSION_TABLE")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")

# --- ユーティリティ関数 ---

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
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
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
        if item and item.get("expires_at", 0) > int(time.time()):
            return item
        return None
    except ClientError as e:
        logger.exception("セッション取得エラー", error=str(e))
        return None

def build_tree(flat_items: list) -> list:
    """工事マスタをツリー構造に変換 (s2から移植)"""
    node_map = {}
    for item in flat_items:
        path = item.get("nodePath")
        if not path: continue
        node = {
            "id": path,
            "title": item.get("title", "No Title"),
            "children": [],
            "tasks": [],
            "safety_equipments": []
        }
        if "is_high_risk" in item: node["is_high_risk"] = item["is_high_risk"]
        node_map[path] = node

    root_nodes = []
    for path, node in node_map.items():
        parts = path.split("#")
        if len(parts) <= 2:
            root_nodes.append(node)
        else:
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)
            if parent:
                indicator = parts[-2]
                if "TASK" in indicator: parent["tasks"].append(node)
                elif "SEQ" in indicator: parent["safety_equipments"].append(node)
                else: parent["children"].append(node)
            else:
                root_nodes.append(node)
    return root_nodes

# --- メインハンドラー ---

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    # セキュリティチェック
    raw_headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    expected = os.environ.get("ORIGIN_VERIFY_SECRET")
    if expected and raw_headers.get("x-origin-verify") != expected:
        return {"statusCode": 403, "body": "Forbidden"}

    origin = raw_headers.get("origin", "")
    cors_headers = get_cors_headers(origin)
    if raw_headers.get('x-requested-with', '').lower() != 'xmlhttprequest':
        return create_response(403, {"message": "Forbidden"}, cors_headers)

    # 1. セッション取得
    session_id = get_session_from_cookie(event)
    if not session_id:
        return create_response(401, {"message": "認証が必要です"}, cors_headers)

    session = get_session(session_id)
    if not session:
        return create_response(401, {"message": "セッションが無効です"}, cors_headers)

    tenant_id = session.get("tenant_id")
    email = session.get("email")
    logger.append_keys(tenant_id=tenant_id, email=email)

    try:
        # 2. ユーザー情報の取得 (s1)
        user_table = dynamodb.Table(USER_TABLE)
        user_response = user_table.get_item(Key={"tenant_id": tenant_id, "email": email})
        user_item = user_response.get("Item") or {}

        # 3. ユーザーの所属部署に基づき工事マスタを取得
        user_departments = user_item.get("departments", {})
        construction_items = []

        if CONSTRUCTION_TABLE:
            const_table = dynamodb.Table(CONSTRUCTION_TABLE)

            # --- A. ユーザーが所属する各部署のデータを取得 ---
            for dept_id in user_departments.keys():
                # nodePath が DEPT#1 などで始まるものをクエリ
                c_res = const_table.query(
                    KeyConditionExpression=Key("tenant_id").eq(tenant_id) &
                                           Key("nodePath").begins_with(dept_id)
                )
                construction_items.extend(c_res.get("Items", []))

            # --- B. 【追加】環境系（ENV）などの共通データを取得 ---
            # 部署に関わらず、nodePath が "ENV" で始まるものを一括取得
            env_res = const_table.query(
                KeyConditionExpression=Key("tenant_id").eq(tenant_id) &
                                       Key("nodePath").begins_with("ENV")
            )
            construction_items.extend(env_res.get("Items", []))

        # 4. データの整形（ツリー化）
        construction_tree = build_tree(construction_items)

        response_body = {
            "user": {
                "tenantId": tenant_id,
                "email": email,
                "role": user_item.get("role"),
                "status": user_item.get("status"),
                "departments": user_departments
            },
            "constructionMaster": construction_tree
        }

        logger.info("ユーザー情報と工事マスタを一括取得しました", action_category="EXECUTE")
        return create_response(200, response_body, cors_headers)

    except Exception as e:
        logger.exception("データ取得中にエラーが発生しました")
        return create_response(500, {"message": "Internal server error"}, cors_headers)