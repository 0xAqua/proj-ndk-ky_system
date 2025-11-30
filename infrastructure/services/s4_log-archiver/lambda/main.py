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
    昨日のログを集計してDynamoDBに保存する
    """
    # 1. 集計期間の設定 (昨日 00:00:00 - 23:59:59 UTC)
    # ※ 本番運用ではタイムゾーン(JST)を考慮して調整してください
    now = datetime.datetime.now(datetime.timezone.utc)
    yesterday = now - datetime.timedelta(days=1)

    start_time = int(yesterday.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
    end_time = int(yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).timestamp())

    print(f"Start Archiving logs from {start_time} to {end_time}")

    # 2. Insights クエリの作成
    # JSONログの中から tenant_id が存在するものを抽出し、必要な項目を選択
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

        # 5. DynamoDBへ書き込み (BatchWrite推奨だが簡易実装としてPutItem)
        table = dynamodb.Table(TABLE_NAME)

        with table.batch_writer() as batch:
            for row in results:
                # Insightsの結果は [{'field': '@timestamp', 'value': '...'}, ...] 形式
                # これを扱いやすい辞書に変換
                item = {d["field"]: d["value"] for d in row}

                # DynamoDBのキーに合わせて整形
                # PK: tenant_id, SK: timestamp (数値)

                # @timestamp (String "2023-...") を UNIXタイムスタンプ(Number) に変換
                dt = datetime.datetime.fromisoformat(item["@timestamp"].replace("Z", "+00:00"))
                ts = int(dt.timestamp() * 1000) # ミリ秒

                db_item = {
                    "tenant_id": item.get("tenant_id", "UNKNOWN"),
                    "timestamp": ts,
                    "user_id": item.get("user_id", "SYSTEM"),
                    "service": item.get("service", "unknown"),
                    "message": item.get("@message"),
                    "created_at": item.get("@timestamp"),
                    # TTL (90日後)
                    "expires_at": int(time.time()) + (90 * 24 * 60 * 60)
                }

                batch.put_item(Item=db_item)

        print("Archiving completed.")

    except Exception as e:
        print(f"Error: {e}")
        raise e