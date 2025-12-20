import os
import json
import time
import boto3
import hashlib
from typing import Dict, List, Optional
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

# 1. 初期化と環境変数の厳格な取得
logger = Logger()
tracer = Tracer()
dynamodb = boto3.resource("dynamodb")

# 環境変数が未設定の場合は起動時にエラーを出す（Fail-Fast）
TABLE_NAME = os.environ["CONSTRUCTION_MASTER_TABLE_NAME"]
SESSION_TABLE = os.environ["SESSION_TABLE"]
# カンマ区切りのホワイトリストをリスト化
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

class SecurityError(Exception):
    """セキュリティ違反を示すカスタム例外"""
    pass

def get_cors_headers(origin: str) -> dict:
    """ホワイトリストに基づいた動的なCORSヘッダー生成"""
    # origin がホワイトリストに含まれているか厳密にチェック
    # credentials=true の場合、ワイルドカード(*)は禁止
    if origin and origin in ALLOWED_ORIGINS:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
            "X-Content-Type-Options": "nosniff", # MIMEタイプ・スニッフィング防止
            "X-Frame-Options": "DENY",           # クリックジャッキング防止
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';"
        }
    return {"Content-Type": "application/json"}

def parse_cookies(cookie_list: list) -> dict:
    """Cookieリストを安全にパース"""
    cookies = {}
    for cookie_str in cookie_list:
        for part in cookie_str.split(';'):
            if '=' in part:
                k, v = part.strip().split('=', 1)
                cookies[k] = v
    return cookies

import hashlib

def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()

def validate_session(event: APIGatewayProxyEventV2) -> Optional[dict]:
    """セッションの存在、整合性、期限を検証"""
    cookies = parse_cookies(event.cookies or [])
    session_id = cookies.get('sessionId')

    if not session_id:
        logger.warning("No sessionId found in cookies")
        return None

    # ★ ハッシュ化してから検索
    hashed_id = hash_session_id(session_id)

    try:
        table = dynamodb.Table(SESSION_TABLE)
        response = table.get_item(Key={'session_id': hashed_id})  # ★ 修正
        session = response.get('Item')

        if not session:
            logger.warning(f"Session not found")
            return None

        if int(session.get("expires_at", 0)) < int(time.time()):
            logger.warning(f"Session expired for user: {session.get('user_id')}")
            return None

        return session
    except Exception as e:
        logger.error(f"Database error during session validation: {str(e)}")
        return None

def create_response(status_code: int, body: dict, cors_headers: dict) -> dict:
    """統一されたレスポンス生成"""
    return {
        "statusCode": status_code,
        "headers": cors_headers,
        "body": json.dumps(body, default=str, ensure_ascii=False)
    }

# --- ロジック関数 ---
def build_tree(flat_items: list) -> list:
    """ツリー構造の構築ロジック"""
    node_map = {}
    for item in flat_items:
        # nodePathがないアイテムはスキップ（データ整合性チェック）
        path = item.get("nodePath")
        if not path: continue

        node = {
            "id": path,
            "title": item.get("title", "No Title"),
            "children": [],
            "tasks": [],
            "safety_equipments": []
        }
        if "is_high_risk" in item:
            node["is_high_risk"] = item["is_high_risk"]
        node_map[path] = node

    root_nodes = []
    for path, node in node_map.items():
        parts = path.split("#")
        # ルート判定: '#'が1つ以下（例: "ROOT" または "DEPT#01"）
        if len(parts) <= 2:
            root_nodes.append(node)
        else:
            parent_path = "#".join(parts[:-2])
            parent = node_map.get(parent_path)
            if parent:
                # 種別に応じた振り分け
                indicator = parts[-2]
                if "TASK" in indicator:
                    parent["tasks"].append(node)
                elif "SEQ" in indicator:
                    parent["safety_equipments"].append(node)
                else:
                    parent["children"].append(node)
            else:
                # 親が見つからない場合はルートとして扱う（孤児ノード防止）
                root_nodes.append(node)
    return root_nodes

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    # ヘッダー取得（正規化）
    req_headers = {k.lower(): v for k, v in event.headers.items()}
    origin = req_headers.get('origin', '')
    cors_headers = get_cors_headers(origin)

    try:
        # 1. CSRF対策: カスタムヘッダーの存在を必須化
        # ブラウザは他ドメインへのリクエストで勝手にカスタムヘッダーを付与できない
        x_req = req_headers.get('x-requested-with', '')
        if x_req.lower() != 'xmlhttprequest':
            logger.error(f"CSRF protection: Invalid X-Requested-With header: {x_req}")
            return create_response(403, {"message": "Forbidden"}, cors_headers)

        # 2. 認証・認可の検証
        session = validate_session(event)
        if not session:
            return create_response(401, {"message": "Unauthorized"}, cors_headers)

        # 3. テナント分離の強制 (Tenant Isolation)
        # セッションに含まれる tenant_id 以外には絶対にアクセスさせない
        tenant_id = str(session.get("tenant_id"))
        logger.append_keys(tenant_id=tenant_id)

        # 4. パラメータのバリデーション
        params = event.query_string_parameters or {}
        dept_prefix = params.get("deptId")
        # 不正な文字が含まれていないかチェック（簡易的なインジェクション対策）
        if dept_prefix and not all(c.isalnum() or c in '#_-' for c in dept_prefix):
            return create_response(400, {"message": "Invalid parameter format"}, cors_headers)

        # 5. データ取得 (Query方式を維持し全件Scanを防止)
        table = dynamodb.Table(TABLE_NAME)
        key_condition = Key("tenant_id").eq(tenant_id)
        if dept_prefix:
            key_condition = key_condition & Key("nodePath").begins_with(dept_prefix)

        response = table.query(KeyConditionExpression=key_condition)

        # 6. ツリー構築とレスポンス
        tree_data = build_tree(response.get("Items", []))
        return create_response(200, tree_data, cors_headers)

    except Exception as e:
        logger.exception("Fatal error in handler")
        # 内部情報を漏らさないよう、詳細なメッセージは返さない
        return create_response(500, {"message": "Internal server error"}, cors_headers)