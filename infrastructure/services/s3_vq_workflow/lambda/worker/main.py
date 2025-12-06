import os
import json
import time
import boto3
import requests
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

# ロガー初期化
logger = Logger()

dynamodb = boto3.resource('dynamodb')
table    = dynamodb.Table(JOB_TABLE_NAME)
sqs      = boto3.client('sqs')
secrets  = boto3.client('secretsmanager')

# ---------------------------------------------------
# 共通関数
# ---------------------------------------------------
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
        logger.error(f"Failed to get secret: {e}")
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
        if lines[0].startswith('```'):
            lines = lines[1:]
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        cleaned = '\n'.join(lines)
    return cleaned.strip()

def is_valid_content(content):
    """JSON検証ロジック"""
    if not content:
        logger.warning("Validation: content is empty")
        return False

    try:
        cleaned = strip_markdown_code_block(content)
        parsed = json.loads(cleaned)

        if not isinstance(parsed, list):
            logger.warning("Validation: root is not a list")
            return False

        if len(parsed) == 0:
            logger.warning("Validation: root list is empty")
            return False

        required_case_keys = {'caseNo', 'caseTitle', 'type', 'overview', 'countermeasures'}
        required_countermeasure_keys = {'id', 'title', 'description', 'assignees'}

        for idx, case in enumerate(parsed):
            if not isinstance(case, dict):
                logger.warning(f"Validation: case[{idx}] is not a dict")
                return False

            missing_keys = required_case_keys - set(case.keys())
            if missing_keys:
                logger.warning(f"Validation: case[{idx}] missing keys: {missing_keys}")
                return False

            if not isinstance(case.get('caseNo'), (int, float)):
                logger.warning(f"Validation: case[{idx}].caseNo is not a number")
                return False

            if not isinstance(case.get('caseTitle'), str):
                logger.warning(f"Validation: case[{idx}].caseTitle is not a string")
                return False
            if not isinstance(case.get('overview'), str):
                logger.warning(f"Validation: case[{idx}].overview is not a string")
                return False

            if case.get('type') not in ('Fact', 'AI'):
                logger.warning(f"Validation: case[{idx}].type is not 'Fact' or 'AI', got: {case.get('type')}")
                return False

            countermeasures = case.get('countermeasures')
            if not isinstance(countermeasures, list):
                logger.warning(f"Validation: case[{idx}].countermeasures is not a list")
                return False

            if len(countermeasures) == 0:
                logger.warning(f"Validation: case[{idx}].countermeasures is empty")
                return False

            for cm_idx, cm in enumerate(countermeasures):
                if not isinstance(cm, dict):
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}] is not a dict")
                    return False

                missing_cm_keys = required_countermeasure_keys - set(cm.keys())
                if missing_cm_keys:
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}] missing keys: {missing_cm_keys}")
                    return False

                if not isinstance(cm.get('id'), (int, float)):
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}].id is not a number")
                    return False

                if not isinstance(cm.get('title'), str):
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}].title is not a string")
                    return False
                if not isinstance(cm.get('description'), str):
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}].description is not a string")
                    return False

                assignees = cm.get('assignees')
                if not isinstance(assignees, list):
                    logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}].assignees is not a list")
                    return False

                for a_idx, assignee in enumerate(assignees):
                    if not isinstance(assignee, str):
                        logger.warning(f"Validation: case[{idx}].countermeasures[{cm_idx}].assignees[{a_idx}] is not a string")
                        return False

        logger.info("Validation: OK - all checks passed")
        return True

    except json.JSONDecodeError as e:
        logger.warning(f"Validation: JSON parse error - {e}")
        return False
    except Exception as e:
        logger.error(f"Validation: unexpected error - {e}")
        return False

def recreate_job(creds, old_job_item, tenant_id):
    """JSONが不正だった場合にジョブを作り直す"""
    logger.info(f"Re-creating job for old tid: {old_job_item['tid']}")

    token = get_auth_token(creds['api_key'], creds['login_id'])

    headers = {
        "X-Auth-Token": f"Bearer {token}",
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

    logger.info(f"New ID acquired: {new_tid}")

    # DynamoDB更新
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
    # ★修正: ここでも MessageAttributes に TenantId を付与してリレーする
    sqs.send_message(
        QueueUrl=SQS_QUEUE_URL,
        MessageBody=json.dumps({
            'job_id': old_job_item['job_id'],
            'tid': new_tid,
            'mid': new_mid,
            'tenant_id': tenant_id
        }),
        MessageAttributes={
            'TenantId': {
                'DataType': 'String',
                'StringValue': tenant_id
            }
        }
    )

# ---------------------------------------------------
# メインハンドラ
# ---------------------------------------------------
@logger.inject_lambda_context
def lambda_handler(event, context):
    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            job_id = body.get('job_id')
            tid = body.get('tid')
            mid = body.get('mid')

            # テナントID取得: Body優先、無ければAttributesから取得
            tenant_id = body.get('tenant_id')
            if not tenant_id:
                msg_attrs = record.get('messageAttributes', {})
                if 'TenantId' in msg_attrs:
                    tenant_id = msg_attrs['TenantId']['stringValue']

            # ログコンテキストに注入
            if tenant_id:
                logger.append_keys(tenant_id=tenant_id)

            logger.info(f"Checking Job: {job_id}, tid: {tid}")

            # データベースからのフォールバック取得
            if not tenant_id:
                item_resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in item_resp:
                    tenant_id = item_resp['Item'].get('tenant_id')
                    logger.append_keys(tenant_id=tenant_id) # 取得できたのでセット

            if not tenant_id:
                logger.error("Error: Tenant ID missing.")
                return # 処理不能

            # 1. 認証情報取得
            creds = get_vq_credentials(tenant_id)
            token = get_auth_token(creds['api_key'], creds['login_id'])

            # 2. ポーリング (GET)
            url = f"{MESSAGE_API_URL}/{tid}/{mid}"
            headers = {"X-Auth-Token": f"Bearer {token}"}

            resp = requests.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            # デバッグログ（構造化ログとして出力）
            logger.debug("VQ API Full Response", extra={"response": data})

            status = data.get('status')

            if status != 'done':
                # まだ終わってなければ例外 -> SQS Visibility Timeoutでリトライ
                raise Exception("Job not finished yet")

            # 3. 完了時の検証
            result_reply = data.get('reply', '')

            if is_valid_content(result_reply):
                logger.info("Validation OK. Saving to DynamoDB...")
                cleaned_reply = strip_markdown_code_block(result_reply)
                table.update_item(
                    Key={'job_id': job_id},
                    UpdateExpression="set #r=:r, #st=:s, updated_at=:u",
                    ExpressionAttributeNames={'#r': 'reply', '#st': 'status'},
                    ExpressionAttributeValues={
                        ':r': cleaned_reply,
                        ':s': 'COMPLETED',
                        ':u': int(time.time())
                    }
                )
            else:
                logger.warning("Validation FAILED.")

                # 無限ループ防止
                resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in resp:
                    current_item = resp['Item']
                    current_retry = int(current_item.get('retry_count', 0))

                    if current_retry >= 3:
                        logger.error(f"Max retries reached ({current_retry}). Marking as FAILED.")
                        table.update_item(
                            Key={'job_id': job_id},
                            UpdateExpression="set #st=:s, updated_at=:u, error_msg=:e",
                            ExpressionAttributeNames={'#st': 'status'},
                            ExpressionAttributeValues={
                                ':s': 'FAILED',
                                ':u': int(time.time()),
                                ':e': 'Validation failed multiple times. Invalid JSON format.'
                            }
                        )
                        return

                    logger.info(f"Retrying... (Count: {current_retry + 1})")
                    recreate_job(creds, current_item, tenant_id)

        except Exception as e:
            # "Job isn't finished yet" は正常な待機状態なのでInfoレベルでも良いが、
            # Lambdaのリトライ機構に乗せるため例外を再送出する
            if "Job not finished yet" in str(e):
                logger.info("Job not finished yet, waiting for retry...")
                raise e
            else:
                logger.exception("Worker Error") # スタックトレース付きログ
                raise e