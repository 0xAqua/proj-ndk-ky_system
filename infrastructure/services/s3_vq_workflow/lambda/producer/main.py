import os
import json
import time
import boto3
import requests
from decimal import Decimal
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

# ---------------------------------------------------
# 初期設定
# ---------------------------------------------------
# 環境変数
JOB_TABLE_NAME  = os.environ.get('JOB_TABLE_NAME')
SQS_QUEUE_URL   = os.environ.get('SQS_QUEUE_URL')
AUTH_API_URL    = os.environ.get('AUTH_API_URL')
MESSAGE_API_URL = os.environ.get('MESSAGE_API_URL')
CALLBACK_URL    = os.environ.get('CALLBACK_URL')
VQ_SECRET_ARN   = os.environ.get('VQ_SECRET_ARN')
ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', 'http://localhost:3000')
CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true"
}

# ロガーの初期化 (構造化ログ用)
logger = Logger()

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table(JOB_TABLE_NAME)
sqs      = boto3.client('sqs')
secrets  = boto3.client('secretsmanager')

# DynamoDBのDecimal型をJSON変換するためのヘルパー
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# ---------------------------------------------------
# 共通関数
# ---------------------------------------------------
def get_vq_credentials(target_tenant_id):
    """Secrets Managerからテナントごとの認証情報を取得"""
    try:
        resp = secrets.get_secret_value(SecretId=VQ_SECRET_ARN)
        secret_json = json.loads(resp.get('SecretString'))

        if isinstance(secret_json, list):
            target_config = next(
                (item for item in secret_json if item.get("tenant_id") == target_tenant_id),
                None
            )
            if not target_config:
                raise Exception(f"Tenant config not found for id: {target_tenant_id}")
            return target_config['secret_data']
        else:
            return secret_json.get('secret_data', secret_json)
    except Exception as e:
        logger.error(f"Failed to get secret: {e}")
        raise e

def get_auth_token(api_key, login_id):
    """VQ API認証トークン取得"""
    resp = requests.post(AUTH_API_URL, json={"api_key": api_key, "login_id": login_id})
    resp.raise_for_status()
    return resp.json().get('token')

# ---------------------------------------------------
# POST: ジョブ作成処理
# ---------------------------------------------------
def handle_post(event):
    try:
        logger.info("Processing POST Request")

        body = json.loads(event.get('body', '{}'))
        input_message = body.get('message')

        # Cognitoからユーザー情報取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        user_id = claims.get('sub', 'unknown')
        tenant_id = claims.get('custom:tenant_id')

        # ★重要: ログコンテキストにテナントIDを注入
        # 以降のログには全て自動的に "tenant_id": "xxx" が付与されます
        if tenant_id:
            logger.append_keys(tenant_id=tenant_id)

        if not tenant_id:
            logger.warning("Missing custom:tenant_id in token")
            return {"statusCode": 400, "body": json.dumps({"error": "Missing custom:tenant_id in token"})}

        # 認証情報の取得
        creds = get_vq_credentials(tenant_id)
        api_key  = creds['api_key']
        login_id = creds['login_id']
        model_id = creds['model_id']

        # VQ API実行
        token = get_auth_token(api_key, login_id)

        headers = {
            "X-Auth-Token": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "message": input_message,
            "model_id": model_id,
            "callback_url": CALLBACK_URL
        }

        logger.debug(f"Payload prepared", extra={"model_id": model_id, "payload": payload})

        vq_resp = requests.post(MESSAGE_API_URL, json=payload, headers=headers)
        vq_resp.raise_for_status()
        vq_data = vq_resp.json()

        tid = vq_data.get('tid')
        mid = vq_data.get('mid')
        job_id = tid

        # DynamoDB登録
        item = {
            'job_id': job_id,
            'tenant_id': tenant_id,
            'user_id': user_id,
            'tid': tid,
            'mid': mid,
            'input_message': input_message,
            'status': 'PENDING',
            'created_at': int(time.time()),
            'updated_at': int(time.time())
        }
        table.put_item(Item=item)

        # SQS送信 (Workerへ)
        # ★修正: MessageAttributes にも TenantId を追加
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                'job_id': job_id,
                'tid': tid,
                'mid': mid,
                'tenant_id': tenant_id
            }),
            MessageAttributes={
                'TenantId': {
                    'DataType': 'String',
                    'StringValue': tenant_id
                }
            }
        )

        logger.info(f"Job accepted: {job_id}")

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"job_id": job_id, "message": "Job accepted"})
        }

    except Exception as e:
        logger.exception("POST Error") # スタックトレースを含めてログ出力
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)})
        }
# ---------------------------------------------------
# GET: ジョブ取得処理
# ---------------------------------------------------
def handle_get(event):
    try:
        logger.info("Processing GET Request")

        job_id = event.get('pathParameters', {}).get('jobId')
        if not job_id:
            return {"statusCode": 400, "body": json.dumps({"error": "Missing jobId parameter"})}

        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        tenant_id = claims.get('custom:tenant_id')

        # ログコンテキスト更新
        if tenant_id:
            logger.append_keys(tenant_id=tenant_id)

        if not tenant_id:
            logger.warning("Unauthorized: No tenant info")
            return {"statusCode": 403, "body": json.dumps({"error": "Unauthorized: No tenant info"})}

        # DynamoDBから取得
        resp = table.get_item(Key={'job_id': job_id})
        item = resp.get('Item')

        if not item:
            return {"statusCode": 404, "body": json.dumps({"error": "Job not found"})}

        # セキュリティチェック: 自テナントのデータのみ許可
        if tenant_id and item.get('tenant_id') != tenant_id:
            logger.warning(f"Access Denied: User tenant {tenant_id} tried to access Job tenant {item.get('tenant_id')}")
            return {"statusCode": 403, "body": json.dumps({"error": "Unauthorized"})}

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(item, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.exception("GET Error")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)})
        }
# ---------------------------------------------------
# メインハンドラ
# ---------------------------------------------------
@logger.inject_lambda_context(log_event=True) # イベント情報をデバッグログに出力（本番はFalseでも可）
def lambda_handler(event, context):
    # HTTPメソッド判定
    http_method = event.get('requestContext', {}).get('http', {}).get('method')

    if http_method == 'GET':
        return handle_get(event)
    elif http_method == 'POST':
        return handle_post(event)
    else:
        logger.warning(f"Method {http_method} not allowed")
        return {
            "statusCode": 405,
            "body": json.dumps({"error": f"Method {http_method} not allowed"})
        }