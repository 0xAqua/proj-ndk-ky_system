import os
import json
import time
import boto3
import requests
from botocore.exceptions import ClientError

# 環境変数
JOB_TABLE_NAME  = os.environ.get('JOB_TABLE_NAME')
SQS_QUEUE_URL   = os.environ.get('SQS_QUEUE_URL')
AUTH_API_URL    = os.environ.get('AUTH_API_URL')
MESSAGE_API_URL = os.environ.get('MESSAGE_API_URL')
CALLBACK_URL    = os.environ.get('CALLBACK_URL')
VQ_SECRET_ARN   = os.environ.get('VQ_SECRET_ARN')

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table(JOB_TABLE_NAME)
sqs      = boto3.client('sqs')
secrets  = boto3.client('secretsmanager')

def get_vq_credentials(target_tenant_id):
    """Secrets ManagerからテナントIDに一致する認証情報を取得"""
    try:
        resp = secrets.get_secret_value(SecretId=VQ_SECRET_ARN)
        secret_json = json.loads(resp.get('SecretString'))

        # 配列から tenant_id が一致するものを探す
        if isinstance(secret_json, list):
            target_config = next(
                (item for item in secret_json if item.get("tenant_id") == target_tenant_id),
                None
            )
            if not target_config:
                raise Exception(f"Tenant config not found for id: {target_tenant_id}")
            return target_config['secret_data']
        else:
            # 配列でない場合のフォールバック
            return secret_json.get('secret_data', secret_json)
    except Exception as e:
        print(f"Failed to get secret: {e}")
        raise e

def get_auth_token(api_key, login_id):
    """VQ認証トークン取得"""
    resp = requests.post(AUTH_API_URL, json={"api_key": api_key, "login_id": login_id})
    resp.raise_for_status()
    return resp.json().get('token')

def lambda_handler(event, context):
    try:
        print("Processing Producer Request")

        # 1. 入力とユーザー情報の取得
        body = json.loads(event.get('body', '{}'))
        input_message = body.get('message')

        # Cognitoからユーザー情報取得
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        user_id = claims.get('sub', 'unknown')
        tenant_id = claims.get('custom:tenant_id')

        if not tenant_id:
            # テナントIDがないと課金先不明になるのでエラーにする
            return {"statusCode": 400, "body": json.dumps({"error": "Missing tenant_id (custom:id) in token"})}

        # 2. テナントIDを使って認証情報を取得
        creds = get_vq_credentials(tenant_id)
        api_key  = creds['api_key']
        login_id = creds['login_id']
        model_id = creds['model_id'] # Secret内のmodel_idを使用

        # 3. VQ Token取得 & Message API (POST)
        token = get_auth_token(api_key, login_id)

        headers = {"X-Auth-Token": token, "Content-Type": "application/json"}
        payload = {
            "message": input_message,
            "model_id": model_id,
            "callback_url": CALLBACK_URL
        }

        vq_resp = requests.post(MESSAGE_API_URL, json=payload, headers=headers)
        vq_resp.raise_for_status()
        vq_data = vq_resp.json()

        tid = vq_data.get('tid')
        mid = vq_data.get('mid')
        job_id = tid  # 今回はtidを主キーとする

        # 4. DynamoDBへ登録 (tenant_idも保存)
        item = {
            'job_id': job_id,
            'tenant_id': tenant_id, # ★ここに追加！後でフィルタ可能に
            'user_id': user_id,
            'tid': tid,
            'mid': mid,
            'input_message': input_message,
            'status': 'PENDING',
            'created_at': int(time.time()),
            'updated_at': int(time.time())
        }
        table.put_item(Item=item)

        # 5. SQSへ送信 (Workerへtenant_idを引き継ぐ)
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                'job_id': job_id,
                'tid': tid,
                'mid': mid,
                'tenant_id': tenant_id # ★Workerへの伝言
            })
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"job_id": job_id, "message": "Job accepted"})
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}