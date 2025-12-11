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

VALID_ACTION_CATEGORIES = {"EXECUTE", "DELETE", "BATCH", "AUTH", "LOGIN", "ERROR"}
DEFAULT_ACTION_CATEGORY = "EXECUTE"

def get_action_category_from_log(msg_data: dict, function_name: str) -> str:
    action_category = msg_data.get("action_category")
    if action_category and action_category in VALID_ACTION_CATEGORIES:
        return action_category
    level = msg_data.get("level", "INFO")
    if level == "ERROR": return "ERROR"
    fn_lower = function_name.lower()
    if any(x in fn_lower for x in ["auth", "otp", "token", "verify-challenge", "create-challenge"]): return "AUTH"
    if any(x in fn_lower for x in ["login", "define-auth"]): return "LOGIN"
    if any(x in fn_lower for x in ["delete", "remove"]): return "DELETE"
    if any(x in fn_lower for x in ["batch", "scheduled", "archiver", "worker"]): return "BATCH"
    return DEFAULT_ACTION_CATEGORY

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    now = datetime.datetime.now(datetime.timezone.utc)
    yesterday = now - datetime.timedelta(days=1)
    start_time = int(yesterday.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    end_time = int(yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).timestamp())

    logger.info("ログアーカイブを開始します", action_category="BATCH", start_time=start_time, end_time=end_time)

    query = """
        fields @timestamp, @message, tenant_id, user_id
        | filter ispresent(tenant_id)
        | sort @timestamp desc
        | limit 10000
    """

    try:
        start_response = logs_client.start_query(
            logGroupNames=TARGET_LOG_GROUPS,
            startTime=start_time,
            endTime=end_time,
            queryString=query,
        )
        query_id = start_response["queryId"]

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

        table = dynamodb.Table(TABLE_NAME)
        written_count = 0
        skipped_count = 0

        # ##### 重複チェック用のセット #####
        seen_keys = set()
        # #############################

        with table.batch_writer() as batch:
            for row in results:
                item = {d["field"]: d["value"] for d in row}
                raw_message = item.get("@message", "{}")

                try:
                    msg_data = json.loads(raw_message)
                except json.JSONDecodeError:
                    skipped_count += 1
                    continue

                try:
                    dt = datetime.datetime.fromisoformat(item["@timestamp"].replace("Z", "+00:00"))
                    ts = int(dt.timestamp() * 1000)
                except (KeyError, ValueError):
                    skipped_count += 1
                    continue

                tenant_id = item.get("tenant_id", "UNKNOWN")

                # ##### 重複回避ロジック #####
                # tenant_id と timestamp が既に処理済みセットにある場合、+1ミリ秒加算してずらす
                # これにより、完全に同時刻のログでも別々のレコードとして保存されます
                while (tenant_id, ts) in seen_keys:
                    ts += 1

                # キーを記録
                seen_keys.add((tenant_id, ts))
                # ########################

                level = msg_data.get("level", "INFO")
                message = msg_data.get("message", "")
                function_name = msg_data.get("function_name", "unknown")
                is_cold_start = msg_data.get("cold_start", False)
                action_category = get_action_category_from_log(msg_data, function_name)

                db_item = {
                    "tenant_id": tenant_id,
                    "timestamp": ts, # 調整済みのタイムスタンプ
                    "level": level,
                    "message": message,
                    "user_id": item.get("user_id", msg_data.get("user_id", "SYSTEM")),
                    "function_name": function_name,
                    "action_category": action_category,
                    "is_cold_start": is_cold_start,
                    "created_at": item.get("@timestamp"),
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