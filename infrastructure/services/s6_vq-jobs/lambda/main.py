"""
VQジョブ履歴取得 Lambda（最適化版）
DynamoDBから tenant_vq_manager テーブルのデータを取得してフロントに返す
- エラーのあるjobを除外
- インシデント0件のjobを除外
- 必要な情報のみ返す（job_id, created_at, incidents の一部フィールド）
"""
import os
import json
import base64
from decimal import Decimal
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")

TABLE_NAME = os.environ["TENANT_VQ_MANAGER_TABLE"]


class DecimalEncoder(json.JSONEncoder):
    """DynamoDB の Decimal 型を JSON シリアライズ可能にする"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


def get_tenant_id_from_event(event: dict) -> str:
    """
    API Gateway Lambda Proxy Integration (v2.0) からテナントIDを取得
    JWT の custom:tenant_id を使用
    """
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        tenant_id = claims.get("custom:tenant_id")

        if not tenant_id:
            logger.warning("JWT に custom:tenant_id が含まれていません", action_category="AUTH")
            raise ValueError("tenant_id not found in JWT")

        return tenant_id
    except (KeyError, TypeError) as e:
        logger.error("JWT クレームの解析に失敗しました", action_category="ERROR", error=str(e))
        raise ValueError("Invalid JWT structure") from e


def filter_and_transform_job(item: dict) -> dict | None:
    """
    ジョブデータをフィルタリング・変換する

    除外条件:
    - error_msg が存在する
    - incidents が0件

    Returns:
        変換後のジョブデータ、または除外する場合は None
    """
    # error_msg がある場合は除外
    if "error_msg" in item and item["error_msg"]:
        logger.debug("エラーのあるジョブを除外", job_id=item.get("job_id"))
        return None

    # replyの解析
    reply = item.get("reply")
    if isinstance(reply, str):
        try:
            reply = json.loads(reply)
        except json.JSONDecodeError:
            logger.warning("reply のパースに失敗", job_id=item.get("job_id"))
            return None

    # incidents の取得
    incidents = []
    if reply and isinstance(reply, dict):
        incidents = reply.get("incidents", [])

    # incidents が0件の場合は除外
    if not incidents or len(incidents) == 0:
        logger.debug("インシデント0件のジョブを除外", job_id=item.get("job_id"))
        return None

    # 必要な情報だけ抽出
    filtered_incidents = []
    for incident in incidents:
        filtered_incident = {
            "id": incident.get("id"),
            "title": incident.get("title"),
            "summary": incident.get("summary"),
            "classification": incident.get("classification")
        }
        filtered_incidents.append(filtered_incident)

    # 最終的なジョブデータ
    job = {
        "job_id": item.get("job_id"),
        "created_at": item.get("created_at"),
        "incidents": filtered_incidents
    }

    return job


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    """
    VQジョブ履歴を取得する（最適化版）

    Query Parameters:
    - limit: 取得件数（デフォルト: 20、最大: 100）
    - last_evaluated_key: ページネーション用（Base64エンコードされたJSON）

    Response:
    {
      "jobs": [
        {
          "job_id": "...",
          "created_at": 1234567890,
          "incidents": [
            {
              "id": 1,
              "title": "...",
              "summary": "...",
              "classification": "..."
            }
          ]
        }
      ],
      "last_evaluated_key": "..." // 次のページがある場合のみ
    }
    """

    try:
        # 1. テナントIDを取得
        tenant_id = get_tenant_id_from_event(event)

        logger.info(
            "VQジョブ履歴取得を開始します",
            action_category="EXECUTE",
            tenant_id=tenant_id
        )

        # 2. クエリパラメータの取得
        query_params = event.get("queryStringParameters") or {}
        limit = int(query_params.get("limit", 20))

        # limitの範囲制限
        if limit < 1:
            limit = 20
        elif limit > 100:
            limit = 100

        # 3. ページネーション用のキー取得
        last_evaluated_key_str = query_params.get("last_evaluated_key")
        exclusive_start_key = None

        if last_evaluated_key_str:
            try:
                # Base64デコード → JSON解析
                decoded = base64.b64decode(last_evaluated_key_str).decode("utf-8")
                exclusive_start_key = json.loads(decoded)
                logger.info("ページネーションキーを使用します", action_category="EXECUTE")
            except (ValueError, json.JSONDecodeError) as e:
                logger.warning(
                    "last_evaluated_key のデコードに失敗しました",
                    action_category="EXECUTE",
                    error=str(e)
                )
                # 無効なキーは無視して最初から取得
                exclusive_start_key = None

        # 4. DynamoDB Query (GSI TenantDateIndex を使用)
        table = dynamodb.Table(TABLE_NAME)

        query_params_dynamodb = {
            "IndexName": "TenantDateIndex",
            "KeyConditionExpression": "tenant_id = :tenant_id",
            "ExpressionAttributeValues": {
                ":tenant_id": tenant_id
            },
            "ScanIndexForward": False,  # created_at の降順（新しい順）
            "Limit": limit
        }

        # ページネーションキーがあれば追加
        if exclusive_start_key:
            query_params_dynamodb["ExclusiveStartKey"] = exclusive_start_key

        response = table.query(**query_params_dynamodb)

        items = response.get("Items", [])

        # 5. フィルタリングと変換
        jobs = []
        for item in items:
            filtered_job = filter_and_transform_job(item)
            if filtered_job:
                jobs.append(filtered_job)

        logger.info(
            "VQジョブ履歴を取得しました",
            action_category="EXECUTE",
            tenant_id=tenant_id,
            total_items=len(items),
            filtered_jobs=len(jobs)
        )

        # 6. 次のページのキーを生成
        result = {
            "jobs": jobs
        }

        last_evaluated_key = response.get("LastEvaluatedKey")
        if last_evaluated_key:
            # JSON → Base64エンコード
            key_json = json.dumps(last_evaluated_key, cls=DecimalEncoder)
            encoded_key = base64.b64encode(key_json.encode("utf-8")).decode("utf-8")
            result["last_evaluated_key"] = encoded_key

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps(result, cls=DecimalEncoder, ensure_ascii=False)
        }

    except ValueError as e:
        logger.error("バリデーションエラー", action_category="ERROR", error=str(e))
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": "Bad Request",
                "message": str(e)
            }, ensure_ascii=False)
        }

    except ClientError as e:
        logger.exception("DynamoDBエラーが発生しました", action_category="ERROR")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": "Internal Server Error",
                "message": "データの取得に失敗しました"
            }, ensure_ascii=False)
        }

    except Exception as e:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": "Internal Server Error",
                "message": "サーバーエラーが発生しました"
            }, ensure_ascii=False)
        }