import os
import json
import boto3
import time
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, SQSEvent

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
secrets = boto3.client("secretsmanager")
TABLE_NAME = os.environ["JOB_TABLE_NAME"]

def get_vq_api_key(tenant_id):
    """Secrets ManagerからテナントごとのAPIキーを取得"""
    # 設計に合わせてパスを調整してください
    secret_name = f"ndk-ky/dev/{tenant_id}/vq-key"
    try:
        resp = secrets.get_secret_value(SecretId=secret_name)
        return json.loads(resp["SecretString"])["api_key"]
    except ClientError:
        logger.exception("Secret retrieval failed")
        raise # システムエラーなのでリトライさせる

def call_vq_api(api_key, eat_value):
    """VQシステムへの連携 (擬似コード)"""
    # ここで requests.post(...) などを行う
    # タイムアウトや500エラーの場合は Exception を raise すること！
    time.sleep(2) # 処理時間のシミュレーション
    return f"VQ Result for {eat_value}"

@tracer.capture_lambda_handler
@event_source(data_class=SQSEvent)
@logger.inject_lambda_context
def lambda_handler(event: SQSEvent, context):
    for record in event.records:
        body = json.loads(record.body)
        tenant_id = body.get("tenant_id")
        job_id = body.get("job_id")
        eat = body.get("input_eat")

        logger.append_keys(job_id=job_id, tenant_id=tenant_id)

        try:
            # 1. バリデーション (リトライさせないパターン)
            if not eat or not tenant_id:
                # これは「アプリ仕様のエラー」なので、リトライしても直らない。
                # Exceptionを上げずに、ステータスをFAILEDにして正常終了(return)し、
                # SQSからメッセージを消す。
                logger.error("Invalid input format. Stopping retry.")
                update_status(tenant_id, job_id, "FAILED", "Invalid input")
                return

                # 2. VQ連携 (時間がかかる処理)
            api_key = get_vq_api_key(tenant_id)
            result = call_vq_api(api_key, eat) # 失敗したらここでExceptionが出る想定

            # 3. 成功時更新
            update_status(tenant_id, job_id, "COMPLETED", result)
            logger.info("Job completed successfully")

        except Exception as e:
            logger.exception("System error occurred. SQS will retry this message.")
            # ★ここで例外を再度発生させると、Lambdaは「失敗」とみなされ、
            # SQSの VisibilityTimeout 後に再試行(リトライ)される。
            # 3回失敗するとDLQへ行く。
            raise e

def update_status(tenant_id, job_id, status, result=None):
    table = dynamodb.Table(TABLE_NAME)
    update_expr = "SET #st = :st, updated_at = :ts"
    expr_attrs = {":st": status, ":ts": int(time.time())}
    expr_names = {"#st": "status"} # statusは予約語の可能性があるため

    if result:
        update_expr += ", #res = :res"
        expr_attrs[":res"] = result
        expr_names["#res"] = "result"

    table.update_item(
        Key={"tenant_id": tenant_id, "job_id": job_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_attrs
    )