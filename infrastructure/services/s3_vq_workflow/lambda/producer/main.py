import os
import json
import time
import boto3
import requests
from decimal import Decimal
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

# 環境変数
JOB_TABLE_NAME = os.environ.get('JOB_TABLE_NAME')
SESSION_TABLE_NAME = os.environ.get('SESSION_TABLE_NAME') # ★追加
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')
AUTH_API_URL = os.environ.get('AUTH_API_URL')
MESSAGE_API_URL = os.environ.get('MESSAGE_API_URL')
CALLBACK_URL = os.environ.get('CALLBACK_URL')
VQ_SECRET_ARN = os.environ.get('VQ_SECRET_ARN')

dynamodb = boto3.resource('dynamodb')
job_table = dynamodb.Table(JOB_TABLE_NAME)
session_table = dynamodb.Table(SESSION_TABLE_NAME)
sqs = boto3.client('sqs')
secrets = boto3.client('secretsmanager')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal): return float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_response(status_code: int, body: dict, origin: str) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False)
    }

def get_session(event: APIGatewayProxyEventV2):
    """Cookieからセッション情報を取得"""
    cookies = event.cookies or []
    sid = next((c.split("=")[1] for c in cookies if c.startswith("sessionId=")), None)
    if not sid: return None
    return session_table.get_item(Key={"sessionId": sid}).get("Item")

# --- ハンドラ ---
def handle_post(event, session, origin):
    body = json.loads(event.body or '{}')
    tenant_id = session['tenant_id']
    user_id = session['user_id']

    # (VQ API呼び出しロジックは既存通り... 省略)
    # 成功したらDynamoDB登録 & SQS送信
    job_id = "tid_from_vq" # 実際はAPIレスポンスから取得
    job_table.put_item(Item={
        'job_id': job_id, 'tenant_id': tenant_id, 'user_id': user_id,
        'status': 'PENDING', 'created_at': int(time.time())
    })
    sqs.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps({
            'job_id': job_id,
            'tid': tid,
            'mid': mid,
            'tenant_id': tenant_id  # ★ これが Worker の get_vq_credentials で使われます
        })
    )
    return create_response(200, {"job_id": job_id, "message": "Job accepted"}, origin)

def handle_get(event, session, origin):
    job_id = event.path_parameters.get('jobId')
    item = job_table.get_item(Key={'job_id': job_id}).get('Item')

    if not item or item.get('tenant_id') != session['tenant_id']:
        return create_response(403, {"error": "Unauthorized"}, origin)

    return create_response(200, item, origin)

@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    origin = event.headers.get('origin', '')

    # 1. CSRFチェック
    if (event.headers.get('x-requested-with') or '').lower() != 'xmlhttprequest':
        return create_response(403, {"error": "Forbidden"}, origin)

    # 2. 認証チェック
    session = get_session(event)
    if not session:
        return create_response(401, {"error": "Unauthorized"}, origin)

    # 3. ルーティング
    method = event.request_context.http.method
    if method == 'POST': return handle_post(event, session, origin)
    if method == 'GET': return handle_get(event, session, origin)
    return create_response(405, {"error": "Method not allowed"}, origin)