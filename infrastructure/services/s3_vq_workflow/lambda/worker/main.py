import os
import json
import boto3
import time
import urllib.request
import urllib.error
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, SQSEvent

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
secrets = boto3.client("secretsmanager")

# 環境変数
TABLE_NAME = os.environ["JOB_TABLE_NAME"]
# 設定値: https://ndis.questella.biz
API_BASE_URL = os.environ.get("EXTERNAL_API_BASE_URL", "https://ndis.questella.biz")
# Webhook URL (Terraformで渡している値)
WEBHOOK_BASE_URL = os.environ.get("WEBHOOK_BASE_URL", "http://localhost:3000/webhook")

def get_vq_secrets(tenant_id):
    """Secrets Managerから認証情報を取得"""
    secret_name = f"ndk-ky/dev/{tenant_id}/vq-key"
    try:
        resp = secrets.get_secret_value(SecretId=secret_name)
        return json.loads(resp["SecretString"])
    except ClientError as e:
        logger.exception(f"Secret retrieval failed for {secret_name}")
        raise e

def get_auth_token(api_key, login_id):
    """
    1. 認証API (/public-api/v1/auth) を叩いてトークンを取得
    """
    url = f"{API_BASE_URL}/public-api/v1/auth"
    logger.info(f"Authenticating with {url}")

    payload = {
        "api_key": api_key,
        "login_id": login_id
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = json.loads(res.read().decode("utf-8"))
            token = body.get("token") or body.get("access_token")
            if not token:
                raise ValueError(f"Token not found in response: {body}")
            return token

    except urllib.error.HTTPError as e:
        logger.error(f"Auth Failed: {e.code} - {e.read().decode('utf-8')}")
        raise e
    except Exception as e:
        logger.exception("Authentication Request Error")
        raise e

def send_message_to_vq(token, prompt, job_id, tenant_id):
    """
    2. メッセージ送信API (/public-api/v1/message/{tid}) を叩く
    """
    # job_id をそのまま tid (スレッドID) として使う
    tid = job_id
    url = f"{API_BASE_URL}/public-api/v1/message/{tid}"
    logger.info(f"Sending message to {url}")

    # ★修正: callback_url に job_id も含める (Webhook側での特定用)
    callback_url = f"{WEBHOOK_BASE_URL}?tenant_id={tenant_id}&job_id={job_id}"

    payload = {
        "message": prompt,
        "callback_url": callback_url
    }

    data = json.dumps(payload).encode("utf-8")

    # ★修正: ヘッダーを X-Auth-Token に変更
    headers = {
        "Content-Type": "application/json",
        "X-Auth-Token": f"Bearer {token}"
    }

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))

    except urllib.error.HTTPError as e:
        logger.error(f"Message Send Failed: {e.code} - {e.read().decode('utf-8')}")
        raise e
    except Exception as e:
        logger.exception("Message Request Error")
        raise e

def update_job_status(tenant_id, job_id, status, api_response=None):
    """DynamoDBのステータス更新"""
    table = dynamodb.Table(TABLE_NAME)

    update_expr = "SET #st = :st, updated_at = :ts"
    expr_attrs = {":st": status, ":ts": int(time.time())}
    expr_names = {"#st": "status"}

    if api_response:
        update_expr += ", #res = :res"
        expr_attrs[":res"] = api_response
        expr_names["#res"] = "api_response"

    try:
        table.update_item(
            Key={"tenant_id": tenant_id, "job_id": job_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_attrs
        )
    except ClientError:
        logger.exception("DynamoDB update failed")
        raise

@tracer.capture_lambda_handler
@event_source(data_class=SQSEvent)
@logger.inject_lambda_context
def lambda_handler(event: SQSEvent, context):
    """
    SQSトリガーで実行されるメイン処理
    """
    for record in event.records:
        try:
            body = json.loads(record.body)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in SQS body")
            continue

        tenant_id = body.get("tenant_id")
        job_id = body.get("job_id")
        prompt = body.get("input_prompt")

        logger.append_keys(job_id=job_id, tenant_id=tenant_id)
        logger.info("Starting VQ integration process")

        try:
            # バリデーション
            if not prompt or not tenant_id or not job_id:
                logger.error("Missing required fields")
                if tenant_id and job_id:
                    update_job_status(tenant_id, job_id, "FAILED", {"error": "Invalid input"})
                return

            # -------------------------------------------------
            # Step 1: Secrets Managerからキー取得
            # -------------------------------------------------
            secrets_data = get_vq_secrets(tenant_id)
            api_key = secrets_data.get("api_key")
            login_id = secrets_data.get("login_id")

            if not api_key or not login_id:
                raise ValueError("api_key or login_id not found in Secrets Manager")

            # -------------------------------------------------
            # Step 2: 認証してトークン取得
            # -------------------------------------------------
            token = get_auth_token(api_key, login_id)

            # -------------------------------------------------
            # Step 3: メッセージ送信 (ヘッダー修正済み)
            # -------------------------------------------------
            api_response = send_message_to_vq(token, prompt, job_id, tenant_id)

            # -------------------------------------------------
            # Step 4: 結果保存 (SENTステータスへ)
            # -------------------------------------------------
            update_job_status(tenant_id, job_id, "SENT", api_response)

            logger.info("Message successfully sent to VQ API")

        except Exception as e:
            logger.exception("Process failed. SQS will retry.")
            raise e