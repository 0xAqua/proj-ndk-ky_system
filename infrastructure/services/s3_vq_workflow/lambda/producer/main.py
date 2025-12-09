import os
import json
import time
import boto3
import requests
from decimal import Decimal
from botocore.exceptions import ClientError

from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# 環境変数
JOB_TABLE_NAME = os.environ.get('JOB_TABLE_NAME')
SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')
AUTH_API_URL = os.environ.get('AUTH_API_URL')
MESSAGE_API_URL = os.environ.get('MESSAGE_API_URL')
CALLBACK_URL = os.environ.get('CALLBACK_URL')
VQ_SECRET_ARN = os.environ.get('VQ_SECRET_ARN')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(JOB_TABLE_NAME)
sqs = boto3.client('sqs')
secrets = boto3.client('secretsmanager')


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
        logger.exception("シークレット取得に失敗しました", action_category="ERROR")
        raise e


def get_auth_token(api_key, login_id):
    """VQ API認証トークン取得"""
    resp = requests.post(AUTH_API_URL, json={"api_key": api_key, "login_id": login_id})
    resp.raise_for_status()
    return resp.json().get('token')


# ---------------------------------------------------
# POST: ジョブ作成処理
# ---------------------------------------------------
def handle_post(event, context):
    try:
        logger.info("POSTリクエストを処理します", action_category="EXECUTE")

        body = json.loads(event.get('body', '{}'))
        input_message = body.get('message')

        # Cognitoからユーザー情報取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        user_id = claims.get('sub', 'unknown')
        tenant_id = claims.get('custom:tenant_id')

        logger.append_keys(tenant_id=tenant_id, user_id=user_id)

        if not tenant_id:
            logger.warning("トークンにtenant_idがありません", action_category="ERROR")
            return {"statusCode": 400, "body": json.dumps({"error": "Missing custom:tenant_id in token"})}

        # 認証情報の取得
        creds = get_vq_credentials(tenant_id)
        api_key = creds['api_key']
        login_id = creds['login_id']
        model_id = creds['model_id']

        # VQ API実行
        token = get_auth_token(api_key, login_id)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "message": input_message,
            "model_id": model_id,
            "callback_url": CALLBACK_URL
        }

        logger.debug("VQ APIリクエスト", action_category="EXECUTE", model_id=model_id, payload=payload)

        vq_resp = requests.post(MESSAGE_API_URL, json=payload, headers=headers)
        vq_resp.raise_for_status()
        vq_data = vq_resp.json()

        tid = vq_data.get('tid')
        mid = vq_data.get('mid')
        job_id = tid  # 今回はtidを主キーとする

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

        logger.info("ジョブをDynamoDBに登録しました", action_category="EXECUTE", job_id=job_id)

        # SQS送信 (Workerへ)
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                'job_id': job_id,
                'tid': tid,
                'mid': mid,
                'tenant_id': tenant_id
            })
        )

        logger.info("ジョブをSQSに送信しました", action_category="EXECUTE", job_id=job_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"job_id": job_id, "message": "Job accepted"})
        }

    except Exception as e:
        logger.exception("POSTリクエスト処理中にエラーが発生しました", action_category="ERROR")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


# ---------------------------------------------------
# GET: ジョブ取得処理
# ---------------------------------------------------
def handle_get(event, context):
    try:
        logger.info("GETリクエストを処理します", action_category="EXECUTE")

        job_id = event.get('pathParameters', {}).get('jobId')
        if not job_id:
            logger.warning("jobIdパラメータがありません", action_category="ERROR")
            return {"statusCode": 400, "body": json.dumps({"error": "Missing jobId parameter"})}

        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        tenant_id = claims.get('custom:tenant_id')

        logger.append_keys(tenant_id=tenant_id, job_id=job_id)

        if not tenant_id:
            logger.warning("トークンにtenant_idがありません", action_category="ERROR")
            return {"statusCode": 403, "body": json.dumps({"error": "Unauthorized: No tenant info"})}

        # DynamoDBから取得
        resp = table.get_item(Key={'job_id': job_id})
        item = resp.get('Item')

        if not item:
            logger.warning("ジョブが見つかりません", action_category="ERROR", job_id=job_id)
            return {"statusCode": 404, "body": json.dumps({"error": "Job not found"})}

        # セキュリティチェック: 自テナントのデータのみ許可
        if tenant_id and item.get('tenant_id') != tenant_id:
            logger.warning(
                "アクセス拒否: 他テナントのジョブへのアクセス",
                action_category="ERROR",
                user_tenant=tenant_id,
                job_tenant=item.get('tenant_id')
            )
            return {"statusCode": 403, "body": json.dumps({"error": "Unauthorized"})}

        logger.info("ジョブを取得しました", action_category="EXECUTE", job_id=job_id)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(item, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.exception("GETリクエスト処理中にエラーが発生しました", action_category="ERROR")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}


# ---------------------------------------------------
# メインハンドラ
# ---------------------------------------------------
@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    # HTTPメソッド判定
    http_method = event.get('requestContext', {}).get('http', {}).get('method')

    if http_method == 'GET':
        return handle_get(event, context)
    elif http_method == 'POST':
        return handle_post(event, context)
    else:
        logger.warning("許可されていないHTTPメソッドです", action_category="ERROR", method=http_method)
        return {
            "statusCode": 405,
            "body": json.dumps({"error": f"Method {http_method} not allowed"})
        }