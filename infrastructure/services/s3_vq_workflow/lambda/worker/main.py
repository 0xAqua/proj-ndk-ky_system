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
    """Producerと同じ認証情報取得ロジック"""
    try:
        resp = secrets.get_secret_value(SecretId=VQ_SECRET_ARN)
        secret_json = json.loads(resp.get('SecretString'))
        if isinstance(secret_json, list):
            target_config = next(
                (item for item in secret_json if item.get("tenant_id") == target_tenant_id), None)
            if not target_config: raise Exception(f"Tenant config not found for id: {target_tenant_id}")
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

def strip_markdown_code_block(content):
    """Markdownコードブロック（```json ... ```）を除去"""
    if not content:
        return content
    cleaned = content.strip()
    if cleaned.startswith('```'):
        lines = cleaned.split('\n')
        # 最初の行（```json）を除去
        if lines[0].startswith('```'):
            lines = lines[1:]
        # 最後の行（```）を除去
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        cleaned = '\n'.join(lines)
    return cleaned


def is_valid_content(content):
    """JSONとしてパースでき、決められたキー構造を満たすかを検証"""
    if not content:
        return False
    try:
        cleaned = strip_markdown_code_block(content)
        parsed = json.loads(cleaned)

        # ルート要素は配列であること
        if not isinstance(parsed, list) or len(parsed) == 0:
            return False

        # 各インシデントの構造をチェック
        required_case_keys = {'caseNo', 'caseTitle', 'type', 'overview', 'countermeasures'}
        required_countermeasure_keys = {'id', 'title', 'description', 'assignees'}

        for case in parsed:
            # 必須キーの存在チェック
            if not isinstance(case, dict):
                return False
            if not required_case_keys.issubset(case.keys()):
                return False

            # typeの値チェック
            if case.get('type') not in ('Fact', 'AI'):
                return False

            # countermeasuresの構造チェック
            countermeasures = case.get('countermeasures')
            if not isinstance(countermeasures, list) or len(countermeasures) == 0:
                return False

            for cm in countermeasures:
                if not isinstance(cm, dict):
                    return False
                if not required_countermeasure_keys.issubset(cm.keys()):
                    return False
                # assigneesは配列であること
                if not isinstance(cm.get('assignees'), list):
                    return False

        return True
    except Exception as e:
        print(f"Validation error: {e}")
        return False

def recreate_job(creds, old_job_item, tenant_id):
    """JSONが不正だった場合にジョブを作り直す"""
    print(f"Re-creating job for old tid: {old_job_item['tid']}")

    token = get_auth_token(creds['api_key'], creds['login_id'])

    headers = {
        "X-Auth-Token": f"Bearer {token}", # ★Bearer付与
        "Content-Type": "application/json"
    }

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

    # DynamoDB更新 (tid/midを新しいものに書き換え)
    table.update_item(
        Key={'job_id': old_job_item['job_id']},
        UpdateExpression="set tid=:t, mid=:m, #st=:s, updated_at=:u, retry_count=if_not_exists(retry_count, :zero) + :inc",
        ExpressionAttributeNames={'#st': 'status'},
        ExpressionAttributeValues={
            ':t': new_tid, ':m': new_mid, ':s': 'PENDING',
            ':u': int(time.time()), ':zero': 0, ':inc': 1
        }
    )

    # 新しいSQSメッセージを送信 (Worker自身へ再送)
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
            headers = {"X-Auth-Token": f"Bearer {token}"} # ★Bearer付与

            resp = requests.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            # ★★★ 追加: VQからの生の返却値をログに出力 ★★★
            print(f"DEBUG: VQ API Full Response: {json.dumps(data, ensure_ascii=False)}")
            # ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

            # ステータス確認 (processing / done)
            status = data.get('status')

            if status != 'done':
                # まだ終わってなければ例外 -> SQS Visibility Timeoutでリトライ
                raise Exception("Job not finished yet")

            # 3. 完了時の検証
            result_message = data.get('reply', '')

            if is_valid_content(result_message):
                # 成功: DB更新
                print("Validation OK.")
                # Markdownコードブロックを除去
                cleaned = content.strip()
                if cleaned.startswith('```'):
                    # ```json や ``` を除去
                    lines = cleaned.split('\n')
                    # 最初の行（```json）と最後の行（```）を除去
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == '```':
                        lines = lines[:-1]
                    cleaned = '\n'.join(lines)

                parsed = json.loads(cleaned)
                if isinstance(parsed, (list, dict)) and len(parsed) > 0:
                    return True
                return False
            else:
                # 失敗: やり直し (Re-create)
                print("Validation FAILED. Re-creating...")
                resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in resp:
                    recreate_job(creds, resp['Item'], tenant_id)

        except Exception as e:
            if "Job not finished yet" in str(e):
                # ポーリング継続のための正常な再試行フロー
                raise e
            else:
                print(f"Worker Error: {e}")
                raise e # 予期せぬエラーもリトライさせる

