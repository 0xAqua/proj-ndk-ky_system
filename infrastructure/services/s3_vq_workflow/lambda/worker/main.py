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
    return cleaned.strip()


def is_valid_content(content):
    """
    JSONとしてパースでき、決められたキー構造を満たすかを検証

    期待する構造:
    [
      {
        "caseNo": 1,
        "caseTitle": "...",
        "type": "Fact" | "AI",
        "overview": "...",
        "countermeasures": [
          {
            "id": 1,
            "title": "...",
            "description": "...",
            "assignees": ["...", "..."]
          },
          ...
        ]
      },
      ...
    ]
    """
    if not content:
        print("Validation: content is empty")
        return False

    try:
        # Markdownコードブロックを除去
        cleaned = strip_markdown_code_block(content)
        parsed = json.loads(cleaned)

        # フォーマット対応: { "incidents": [...] }であること
        if isinstance(parsed, dict) and 'incidents' in parsed:
            incidents = parsed['incidents']
        elif isinstance(parsed, list):
            incidents = parsed
        else:
            logger.warning("Validation: invalid root structure")
            return False

        if len(parsed) == 0:
            print("Validation: root list is empty")
            return False

        # 必須キーの定義
        required_case_keys = {'caseNo', 'caseTitle', 'type', 'overview', 'countermeasures'}
        required_countermeasure_keys = {'id', 'title', 'description', 'assignees'}

        for idx, case in enumerate(parsed):
            # 各caseはdictであること
            if not isinstance(case, dict):
                print(f"Validation: case[{idx}] is not a dict")
                return False

            # 必須キーの存在チェック
            missing_keys = required_case_keys - set(case.keys())
            if missing_keys:
                print(f"Validation: case[{idx}] missing keys: {missing_keys}")
                return False

            # caseNo は数値であること
            if not isinstance(case.get('caseNo'), (int, float)):
                print(f"Validation: case[{idx}].caseNo is not a number")
                return False

            # caseTitle, overview は文字列であること
            if not isinstance(case.get('caseTitle'), str):
                print(f"Validation: case[{idx}].caseTitle is not a string")
                return False
            if not isinstance(case.get('overview'), str):
                print(f"Validation: case[{idx}].overview is not a string")
                return False

            # type の値チェック
            if case.get('type') not in ('Fact', 'AI'):
                print(f"Validation: case[{idx}].type is not 'Fact' or 'AI', got: {case.get('type')}")
                return False

            # countermeasures の構造チェック
            countermeasures = case.get('countermeasures')
            if not isinstance(countermeasures, list):
                print(f"Validation: case[{idx}].countermeasures is not a list")
                return False

            if len(countermeasures) == 0:
                print(f"Validation: case[{idx}].countermeasures is empty")
                return False

            for cm_idx, cm in enumerate(countermeasures):
                if not isinstance(cm, dict):
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}] is not a dict")
                    return False

                # 必須キーの存在チェック
                missing_cm_keys = required_countermeasure_keys - set(cm.keys())
                if missing_cm_keys:
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}] missing keys: {missing_cm_keys}")
                    return False

                # id は数値であること
                if not isinstance(cm.get('id'), (int, float)):
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}].id is not a number")
                    return False

                # title, description は文字列であること
                if not isinstance(cm.get('title'), str):
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}].title is not a string")
                    return False
                if not isinstance(cm.get('description'), str):
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}].description is not a string")
                    return False

                # assignees は文字列の配列であること
                assignees = cm.get('assignees')
                if not isinstance(assignees, list):
                    print(f"Validation: case[{idx}].countermeasures[{cm_idx}].assignees is not a list")
                    return False

                for a_idx, assignee in enumerate(assignees):
                    if not isinstance(assignee, str):
                        print(f"Validation: case[{idx}].countermeasures[{cm_idx}].assignees[{a_idx}] is not a string")
                        return False

        print("Validation: OK - all checks passed")
        return True

    except json.JSONDecodeError as e:
        print(f"Validation: JSON parse error - {e}")
        return False
    except Exception as e:
        print(f"Validation: unexpected error - {e}")
        return False


def recreate_job(creds, old_job_item, tenant_id):
    """JSONが不正だった場合にジョブを作り直す"""
    print(f"Re-creating job for old tid: {old_job_item['tid']}")

    token = get_auth_token(creds['api_key'], creds['login_id'])

    headers = {
        "Authorization": f"Bearer {token}", # ★Bearer付与
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
            headers = {"Authorization": f"Bearer {token}"} # ★Bearer付与

            resp = requests.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            # ★★★ VQからの生の返却値をログに出力 ★★★
            print(f"DEBUG: VQ API Full Response: {json.dumps(data, ensure_ascii=False)}")

            # ステータス確認 (processing / done)
            status = data.get('status')

            if status != 'done':
                # まだ終わってなければ例外 -> SQS Visibility Timeoutでリトライ
                raise Exception("Job not finished yet")

            # 3. 完了時の検証
            result_reply = data.get('reply', '')

            if is_valid_content(result_reply):
                # 成功: DB更新（Markdownコードブロックを除去して保存）
                print("Validation OK. Saving to DynamoDB...")
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
                # 失敗: やり直し (Re-create)
                print("Validation FAILED.")

                # ★追加: 無限ループ防止のための回数チェック
                resp = table.get_item(Key={'job_id': job_id})
                if 'Item' in resp:
                    current_item = resp['Item']
                    current_retry = int(current_item.get('retry_count', 0))

                    # 例: 3回以上リトライしていたら、あきらめてFAILEDにする
                    if current_retry >= 3:
                        print(f"Max retries reached ({current_retry}). Marking as FAILED.")
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
                        return # ここで終了（再送しない）

                    # まだ上限に達していなければ再作成
                    print(f"Retrying... (Count: {current_retry + 1})")
                    recreate_job(creds, current_item, tenant_id)

        except Exception as e:
            if "Job not finished yet" in str(e):
                # ポーリング継続のための正常な再試行フロー
                raise e
            else:
                print(f"Worker Error: {e}")
                raise e # 予期せぬエラーもリトライさせる