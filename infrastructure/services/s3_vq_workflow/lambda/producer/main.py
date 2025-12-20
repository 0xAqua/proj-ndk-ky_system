import os
import json
import time
import boto3
import requests
import hashlib
from decimal import Decimal
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()

# 環境変数
JOB_TABLE_NAME = os.environ.get('JOB_TABLE_NAME')
SESSION_TABLE = os.environ.get('SESSION_TABLE')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')
AUTH_API_URL = os.environ.get('AUTH_API_URL')
MESSAGE_API_URL = os.environ.get('MESSAGE_API_URL')
CALLBACK_URL = os.environ.get('CALLBACK_URL')
VQ_SECRET_ARN = os.environ.get('VQ_SECRET_ARN')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '').split(',')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(JOB_TABLE_NAME)
sqs = boto3.client('sqs')
secrets = boto3.client('secretsmanager')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# --- 共通ユーティリティ ---

def create_response(status_code: int, body: dict, origin: str) -> dict:
    """CORS対応レスポンス生成"""
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Credentials": "true"
    }
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin

    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False)
    }

def hash_session_id(session_id: str) -> str:
    """セッションIDをSHA-256でハッシュ化"""
    return hashlib.sha256(session_id.encode()).hexdigest()

def get_session(event: APIGatewayProxyEventV2):
    """Cookieからセッション情報を取得"""
    raw_cookies = event.get('cookies', [])
    session_id = None
    for c in raw_cookies:
        if c.startswith("sessionId="):
            session_id = c.split("=")[1]
            break

    if not session_id:
        return None

    # ★ ハッシュ化してから検索
    hashed_id = hash_session_id(session_id)

    try:
        session_db = dynamodb.Table(SESSION_TABLE)
        resp = session_db.get_item(Key={'session_id': hashed_id})  # ★ 修正
        item = resp.get('Item')
        if item and item.get('expires_at', 0) > int(time.time()):
            return item
    except Exception as e:
        logger.error(f"Session retrieval error: {str(e)}")
    return None

def get_vq_credentials(target_tenant_id):
    """Secrets Managerから認証情報を取得"""
    resp = secrets.get_secret_value(SecretId=VQ_SECRET_ARN)
    secret_json = json.loads(resp.get('SecretString'))

    # テナントリスト形式か単一オブジェクト形式か判定
    if isinstance(secret_json, list):
        target_config = next((item for item in secret_json if item.get("tenant_id") == target_tenant_id), None)
        if not target_config:
            raise Exception(f"Tenant config not found: {target_tenant_id}")
        return target_config['secret_data']
    return secret_json.get('secret_data', secret_json)

# --- POST: ジョブ作成 ---
def handle_post(event, session, origin):
    body = json.loads(event.body or '{}')
    input_message = body.get('message')

    tenant_id = session.get('tenant_id')
    user_id = session.get('user_id')
    logger.append_keys(tenant_id=tenant_id, user_id=user_id)

    # 1. VQ API 認証 & 実行
    creds = get_vq_credentials(tenant_id)
    resp_auth = requests.post(AUTH_API_URL, json={"api_key": creds['api_key'], "login_id": creds['login_id']})
    resp_auth.raise_for_status()
    token = resp_auth.json().get('token')

    vq_payload = {
        "message": input_message,
        "model_id": creds['model_id'],
        "callback_url": CALLBACK_URL
    }
    resp_vq = requests.post(MESSAGE_API_URL, json=vq_payload, headers={"Authorization": f"Bearer {token}"})
    resp_vq.raise_for_status()
    vq_data = resp_vq.json()

    tid = vq_data.get('tid')
    mid = vq_data.get('mid')
    job_id = tid

    # 2. DynamoDB登録
    table.put_item(Item={
        'job_id': job_id,
        'tenant_id': tenant_id,
        'user_id': user_id,
        'tid': tid,
        'mid': mid,
        'input_message': input_message,
        'status': 'PENDING',
        'retry_count': 0,
        'created_at': int(time.time()),
        'updated_at': int(time.time())
    })

    # 3. SQS送信
    sqs.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps({
            'job_id': job_id,
            'tid': tid,
            'mid': mid,
            'tenant_id': tenant_id
        })
    )

    return create_response(200, {"job_id": job_id, "message": "Job accepted"}, origin)

# --- GET: ジョブ取得 ---
def handle_get(event, session, origin):
    job_id = event.path_parameters.get('jobId')
    tenant_id = session.get('tenant_id')

    resp = table.get_item(Key={'job_id': job_id})
    item = resp.get('Item')

    if not item or item.get('tenant_id') != tenant_id:
        return create_response(403, {"error": "Unauthorized"}, origin)

    view_item = {
        "job_id": item.get("job_id"),
        "status": item.get("status"),
        "reply": item.get("reply"),
        "error_msg": item.get("error_msg")  # 失敗時のエラー理由
    }

    return create_response(200, view_item, origin)

# --- メインハンドラ ---
@tracer.capture_lambda_handler
@event_source(data_class=APIGatewayProxyEventV2)
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: APIGatewayProxyEventV2, context: LambdaContext):
    origin = event.headers.get('origin', '')

    # 1. CSRFチェック
    if (event.headers.get('x-requested-with') or '').lower() != 'xmlhttprequest':
        return create_response(403, {"error": "Forbidden"}, origin)

    # 2. セッション認証
    session = get_session(event)
    if not session:
        return create_response(401, {"error": "Unauthorized"}, origin)

    # 3. ルーティング
    method = event.request_context.http.method
    if method == 'POST':
        return handle_post(event, session, origin)
    elif method == 'GET':
        return handle_get(event, session, origin)

    return create_response(405, {"error": "Method not allowed"}, origin)