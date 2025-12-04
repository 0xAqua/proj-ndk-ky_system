import os
import json
import time
import boto3
import requests

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
    """(Producerと同じロジック)"""
    try:
        resp = secrets.get_secret_value(SecretId=VQ_SECRET_ARN)
        secret_json = json.loads(resp.get('SecretString'))
        if isinstance(secret_json, list):
            target_config = next(
                (item for item in secret_json if item.get("tenant_id") == target_tenant_id), None)
            if not target_config: raise Exception(f"Tenant config not found: {target_tenant_id}")
            return target_config['secret_data']
        else:
            return secret_json.get('secret_data', secret_json)
    except Exception as e:
        print(f"Failed to get secret: {e}")
        raise e

def get_auth_token(api_key, login_id):
    resp = requests.post(AUTH_API_URL, json={"api_key": api_key, "login_id": login_id})
    resp.raise_for_status()
    return resp.json().get('token')

def is_valid_content(content):
    """簡易バリデーション: JSONとしてパースでき、空でないか"""
    if not content: return False
    try:
        parsed = json.loads(content)
        return True if isinstance(parsed, list) and len(parsed) > 0 else False
    except:
        return False

def recreate_job(creds, old_job_item, tenant_id):
    """JSON不正時にジョブを作り直す"""
    print(f"Re-creating job for old tid: {old_job_item['tid']}")

    token = get_auth_token(creds['api_key'], creds['login_id'])
    headers = {"X-Auth-Token": token, "Content-Type": "application/json"}

    payload = {
        "message": old_job_item.get('input_message'),
        "model_id": creds['model_id'],
        "callback_url": CALLBACK_URL
    }

    vq_resp = requests.post(MESSAGE_API_URL, json=payload, headers=headers)
    vq_resp.raise_for_status()
    vq_data = vq_resp.json()

    new_tid = vq_data.get('tid')
    new_mid = vq_data.get('mid')

    print(f"New ID acquired: {new_tid}")

    # DB更新 (Job IDは変えず、tid/midを更新)
    table.update_item(
        Key={'job_id': old_job_item['job_id']},
        UpdateExpression="set tid=:t, mid=:m, #st=:s, updated_at=:u, retry_count=if_not_exists(retry_count, :zero) + :inc",
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':t': new_tid, ':m': new_mid, ':s': 'PENDING',
            ':u': int(time.time()), ':zero': 0, ':inc': 1
        }
    )

    # 新しいSQSメッセージを送信 (★tenant_id も忘れず引き継ぐ)
    sqs.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps({
            'job_id': old_job_item['job_id'],
            'tid': new_tid,
            'mid': new_mid,
            'tenant_id': tenant_id
        })
    )

def lambda_handler(event, context):
    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            job_id = body.get('job_id')
            tid = body.get('tid')
            mid = body.get('mid')
            tenant_id = body.get('tenant_id')

            print(f"Checking Job: {job_id}, tid: {tid}, tenant: {tenant_id}")

            # tenant_id がSQSにない場合の復旧ロジック
            if not tenant_id:
                item_resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in item_resp:
                    tenant_id = item_resp['Item'].get('tenant_id')

            if not tenant_id:
                print("Error: Tenant ID missing.")
                return # 処理不能

            # 1. 認証情報取得
            creds = get_vq_credentials(tenant_id)
            token = get_auth_token(creds['api_key'], creds['login_id'])

            # 2. ポーリング (GET)
            url = f"{MESSAGE_API_URL}/{tid}/{mid}"
            resp = requests.get(url, headers={"X-Auth-Token": token})
            resp.raise_for_status()
            data = resp.json()

            status = data.get('status')

            if status != 'done':
                # まだ終わってなければ例外 -> SQS Visibility Timeoutでリトライ
                raise Exception("Job not finished yet")

            # 3. 完了時の検証
            result_message = data.get('message', '')

            if is_valid_content(result_message):
                # 成功: DB更新
                print("Validation OK.")
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression="set #r=:r, #st=:s, updated_at=:u",
                    ExpressionAttributeNames={'#r': 'reply', '#st': 'status'},
                    ExpressionAttributeValues={
                        ':r': result_message,
                        ':s': 'COMPLETED',
                        ':u': int(time.time())
                    }
                )
            else:
                # 失敗: やり直し
                print("Validation FAILED. Re-creating...")
                resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in resp:
                    recreate_job(creds, resp['Item'], tenant_id)

        except Exception as e:
            if "Job not finished yet" in str(e):
                raise e # SQSリトライさせる
            else:
                print(f"Worker Error: {e}")
                raise e # 予期せぬエラーもリトライ（要件次第でDLQへ）