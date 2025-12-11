"""
ログアーカイブ Lambda
昨日のログを集計してDynamoDBに保存する
"""
import os
import json
import time
import datetime
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

logs_client = boto3.client("logs")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["LOG_ARCHIVE_TABLE"]
TARGET_LOG_GROUPS = os.environ["TARGET_LOG_GROUPS"].split(",")

# 有効なaction_categoryの一覧
VALID_ACTION_CATEGORIES = {"EXECUTE", "DELETE", "BATCH", "AUTH", "LOGIN", "ERROR"}
DEFAULT_ACTION_CATEGORY = "EXECUTE"


def get_action_category_from_log(msg_data: dict, function_name: str) -> str:
    """
    ログデータからaction_categoryを取得
    1. ログに直接action_categoryがあればそれを使用
    2. なければlevelとfunction_nameから推測
    """
    # 1. ログから直接取得（各Lambdaで出力している場合）
    action_category = msg_data.get("action_category")
    if action_category and action_category in VALID_ACTION_CATEGORIES:
        return action_category

    # 2. フォールバック: levelとfunction_nameから推測
    level = msg_data.get("level", "INFO")

    # エラーは最優先
    if level == "ERROR":
        return "ERROR"

    # function_nameから推測
    fn_lower = function_name.lower()

    # 認証系
    if any(x in fn_lower for x in ["auth", "otp", "token", "verify-challenge", "create-challenge"]):
        return "AUTH"

    # ログイン系
    if any(x in fn_lower for x in ["login", "define-auth"]):
        return "LOGIN"

    # 削除系
    if any(x in fn_lower for x in ["delete", "remove"]):
        return "DELETE"

    # バッチ系（EventBridge経由）
    if any(x in fn_lower for x in ["batch", "scheduled", "archiver", "worker"]):
        return "BATCH"

    return DEFAULT_ACTION_CATEGORY


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    """
    昨日のログを集計してDynamoDBに保存する

    スキーマ:
    - tenant_id (PK)
    - timestamp (SK)
    - level: INFO / WARN / ERROR
    - message: 人間が読める1行テキスト
    - user_id
    - function_name: Lambda関数名
    - action_category: EXECUTE / DELETE / BATCH / AUTH / LOGIN / ERROR
    - is_cold_start
    - created_at
    - expires_at (TTL)
    """

    # 1. 集計期間の設定 (昨日 00:00:00 - 23:59:59 UTC)
    now = datetime.datetime.now(datetime.timezone.utc)
    yesterday = now - datetime.timedelta(days=1)

    start_time = int(yesterday.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    end_time = int(yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).timestamp())

    logger.info(
        "ログアーカイブを開始します",
        action_category="BATCH",
        start_time=start_time,
        end_time=end_time
    )

    # 2. Insights クエリの作成
    # 各Lambdaが出力する構造化ログから必要なフィールドを取得
    query = """
        fields @timestamp, @message, tenant_id, user_id
        | filter ispresent(tenant_id)
        | sort @timestamp desc
        | limit 10000
    """

    try:
        # 3. クエリ実行開始
        start_response = logs_client.start_query(
            logGroupNames=TARGET_LOG_GROUPS,
            startTime=start_time,
            endTime=end_time,
            queryString=query,
        )
        query_id = start_response["queryId"]

        logger.info("CloudWatch Insightsクエリを開始しました", action_category="BATCH", query_id=query_id)

        # 4. 完了まで待機 (ポーリング)
        while True:
            response = logs_client.get_query_results(queryId=query_id)
            status = response["status"]

            if status in ["Complete", "Failed", "Cancelled"]:
                break

            time.sleep(1)

        if status != "Complete":
            logger.error("クエリが失敗しました", action_category="ERROR", status=status)
            return

        results = response["results"]
        logger.info("ログを取得しました", action_category="BATCH", log_count=len(results))

        # 5. DynamoDBへ書き込み
        table = dynamodb.Table(TABLE_NAME)
        written_count = 0
        skipped_count = 0

        with table.batch_writer() as batch:
            for row in results:
                # CloudWatch Insightsの結果は [{'field': '...', 'value': '...'}, ...] 形式
                item = {d["field"]: d["value"] for d in row}

                # A. メッセージ内のJSON文字列をパース
                raw_message = item.get("@message", "{}")
                try:
                    msg_data = json.loads(raw_message)
                except json.JSONDecodeError:
                    # JSONでないログはスキップ
                    skipped_count += 1
                    continue

                # B. タイムスタンプの変換 (ISO -> UNIXミリ秒)
                try:
                    dt = datetime.datetime.fromisoformat(item["@timestamp"].replace("Z", "+00:00"))
                    ts = int(dt.timestamp() * 1000)
                except (KeyError, ValueError):
                    skipped_count += 1
                    continue

                # C. 各フィールドを抽出
                level = msg_data.get("level", "INFO")
                message = msg_data.get("message", "")  # 人間が読める1行テキスト
                function_name = msg_data.get("function_name", "unknown")
                is_cold_start = msg_data.get("cold_start", False)

                # D. action_categoryの取得
                action_category = get_action_category_from_log(msg_data, function_name)

                # E. DynamoDB保存用アイテムの作成
                db_item = {
                    # キー
                    "tenant_id": item.get("tenant_id", "UNKNOWN"),
                    "timestamp": ts,

                    # ログ本体
                    "level": level,
                    "message": message,

                    # コンテキスト
                    "user_id": item.get("user_id", msg_data.get("user_id", "SYSTEM")),
                    "function_name": function_name,
                    "action_category": action_category,

                    # メタ情報
                    "is_cold_start": is_cold_start,
                    "created_at": item.get("@timestamp"),

                    # TTL (90日後に自動削除)
                    "expires_at": int(time.time()) + (90 * 24 * 60 * 60)
                }

                batch.put_item(Item=db_item)
                written_count += 1

        logger.info(
            "ログアーカイブが完了しました",
            action_category="BATCH",
            written_count=written_count,
            skipped_count=skipped_count
        )

    except ClientError as e:
        logger.exception("AWSサービスエラーが発生しました", action_category="ERROR")
        raise e
    except Exception as e:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        raise e