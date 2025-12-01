import os
import json
import uuid
import boto3
import time
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

TABLE_NAME = os.environ["JOB_TABLE_NAME"]
QUEUE_URL = os.environ["SQS_QUEUE_URL"]

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    # 1. 入力チェック
    body = json.loads(event.body or "{}")
    eat = body.get("eat")

    if not eat:
        return {"statusCode": 400, "body": json.dumps({"message": "eat is required"})}

    # テナントID取得 (JWTから)
    claims = event.request_context.authorizer.jwt.claims
    tenant_id = claims.get("custom:tenant_id") or claims.get("tenant_id")

    # 2. Job ID 生成 (AWS側でUUID発行)
    job_id = str(uuid.uuid4())
    logger.append_keys(job_id=job_id, tenant_id=tenant_id)

    # 3. DynamoDBへ初期ステータス保存
    table = dynamodb.Table(TABLE_NAME)
    timestamp = int(time.time())

    item = {
        "tenant_id": tenant_id,
        "job_id": job_id,       # SK
        "status": "PENDING",    # 待機中
        "input_eat": eat,
        "created_at": timestamp,
        "updated_at": timestamp
    }
    table.put_item(Item=item)

    # 4. SQSへメッセージ送信
    message_body = {
        "tenant_id": tenant_id,
        "job_id": job_id,
        "input_eat": eat
    }
    sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(message_body)
    )

    logger.info("Job accepted")

    # 5. 即座にJob IDを返す (AGWの29秒制限回避)
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"jobId": job_id, "message": "Job accepted"})
    }