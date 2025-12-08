import os
import json
import time
import datetime
import boto3
from botocore.exceptions import ClientError

logs_client = boto3.client("logs")
dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["LOG_ARCHIVE_TABLE"]
# 環境変数からリストに戻す
TARGET_LOG_GROUPS = os.environ["TARGET_LOG_GROUPS"].split(",")

def lambda_handler(event, context):
    """
    昨日のログを集計してDynamoDBに保存する（機能拡張版）
    - JSONログの中身をパースして詳細情報を展開
    - アクション区分、コールドスタート、Lambda関数名を抽出
    """

    # 1. 集計期間の設定 (昨日 00:00:00 - 23:59:59 UTC)
    # ※ 本番運用ではタイムゾーン(JST)を考慮して調整してください
    now = datetime.datetime.now(datetime.timezone.utc)
    yesterday = now - datetime.timedelta(days=1)

    start_time = int(yesterday.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    end_time = int(yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).timestamp())

    print(f"Start Archiving logs from {start_time} to {end_time}")

    # 2. Insights クエリの作成
    # @message (JSON文字列) も取得して、後でPython側でパースします
    query = """
        fields @timestamp, @message, tenant_id, user_id, service
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

        # 4. 完了まで待機 (ポーリング)
        while True:
            response = logs_client.get_query_results(queryId=query_id)
            status = response["status"]

            if status in ["Complete", "Failed", "Cancelled"]:
                break

            time.sleep(1)

        if status != "Complete":
            print(f"Query failed: {status}")
            return

        results = response["results"]
        print(f"Found {len(results)} logs.")

        # 5. DynamoDBへ書き込み
        table = dynamodb.Table(TABLE_NAME)

        with table.batch_writer() as batch:
            for row in results:
                # CloudWatch Insightsの結果は [{'field': '...', 'value': '...'}, ...] 形式
                # これを扱いやすい辞書 {key: value} に変換
                item = {d["field"]: d["value"] for d in row}

                # --- 拡張ロジック開始 ---

                # A. メッセージ内のJSON文字列を辞書オブジェクトに変換（パース）
                raw_message = item.get("@message", "{}")
                try:
                    msg_data = json.loads(raw_message)
                except json.JSONDecodeError:
                    # 万が一JSONでないログが混じっていた場合の対策
                    msg_data = {}

                # B. タイムスタンプの変換
                # CloudWatchの "2023-01-01T00:00:00.000Z" を UNIXミリ秒に変換
                dt = datetime.datetime.fromisoformat(item["@timestamp"].replace("Z", "+00:00"))
                ts = int(dt.timestamp() * 1000)

                # C. アクション区分（Category）の自動判定
                # level=ERROR なら "ERROR"
                # service名に "Auth" があれば "LOGIN"
                # それ以外は "EXECUTE"
                level = msg_data.get("level", "INFO")
                service_name = item.get("service", "unknown")

                if level == "ERROR":
                    action_category = "ERROR"
                elif "Auth" in service_name:
                    action_category = "LOGIN"
                else:
                    action_category = "EXECUTE"

                # D. 統計・詳細情報の抽出
                # コールドスタートだったか？ (True/False)
                is_cold_start = msg_data.get("cold_start", False)
                # 実際に動いたLambda関数名
                lambda_name = msg_data.get("function_name", "unknown")

                # --- 拡張ロジック終了 ---

                # DynamoDB保存用アイテムの作成
                db_item = {
                    # キー情報
                    "tenant_id": item.get("tenant_id", "UNKNOWN"),
                    "timestamp": ts,

                    # ★追加した分析用カラム
                    "action_category": action_category, # LOGIN / EXECUTE / ERROR
                    "is_cold_start": is_cold_start,     # true / false
                    "function_name": lambda_name,       # 具体的なLambda名

                    # 基本情報
                    "user_id": item.get("user_id", "SYSTEM"),
                    "service": service_name,
                    "message": raw_message,             # 生ログも念のため保存
                    "created_at": item.get("@timestamp"),

                    # TTL (90日後に自動削除)
                    "expires_at": int(time.time()) + (90 * 24 * 60 * 60)
                }

                batch.put_item(Item=db_item)

        print("Archiving completed.")

    except Exception as e:
        print(f"Error: {e}")
        raise e