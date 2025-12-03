import os
import json
import uuid
import time
import boto3
import hmac
import hashlib
from decimal import Decimal
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.data_classes import event_source, APIGatewayProxyEventV2

logger = Logger()
tracer = Tracer()

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")
secrets = boto3.client("secretsmanager") # ★追加

TABLE_NAME = os.environ["JOB_TABLE_NAME"]
QUEUE_URL = os.environ["JOB_QUEUE_URL"]

# ... (lambda_handler, create_job, get_job_status は変更なし) ...

def get_vq_secrets(tenant_id):
    """Secrets Managerからキーを取得"""
    secret_name = f"ndk-ky/dev/{tenant_id}/vq-key"
    try:
        resp = secrets.get_secret_value(SecretId=secret_name)
        return json.loads(resp["SecretString"])
    except Exception as e:
        logger.error(f"Secret verify failed: {e}")
        return None

def verify_signature(secret, body, signature):
    """HMAC-SHA256で署名を検証"""
    if not secret or not signature:
        return False

    # 署名計算
    mac = hmac.new(
        secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256
    )
    expected_signature = mac.hexdigest()

    # 比較 (タイミング攻撃防止のため compare_digest 推奨)
    return hmac.compare_digest(expected_signature, signature)

def handle_webhook(event):
    """受取処理: 署名検証付き"""
    try:
        # 1. テナントIDの特定 (クエリパラメータ)
        query_params = event.query_string_parameters or {}
        tenant_id = query_params.get("tenant_id")

        if not tenant_id:
            logger.error("Webhook missing tenant_id")
            return {"statusCode": 400, "body": "Missing tenant_id"}

        # 2. Secrets ManagerからWebhook Secretを取得
        secrets_data = get_vq_secrets(tenant_id)
        if not secrets_data:
            return {"statusCode": 500, "body": "Server Configuration Error"}

        webhook_secret = secrets_data.get("webhook_secret")

        # 3. 署名検証
        headers = event.headers or {}
        # ヘッダーは大文字小文字を区別しないように取得
        signature = headers.get("x-signature") or headers.get("X-Signature")
        raw_body = event.body or "{}" # 署名検証には生のbodyが必要

        if not verify_signature(webhook_secret, raw_body, signature):
            logger.warning(f"Invalid Signature. Tenant: {tenant_id}")
            return {"statusCode": 401, "body": "Invalid Signature"}

        # 4. ここから既存の処理 (JSONパース & DB更新)
        body = json.loads(raw_body)
        logger.info(f"Webhook received verified: {json.dumps(body)}")

        # 仕様書に合わせてIDを取得 (mid がメッセージID)
        # 今回の構成では job_id = tid (スレッドID) としているので tid を使用
        # 仕様書例: { "mid": "...", "reply": "...", "status": "..." }
        # ※仕様書に `tid` が含まれていない場合、Workerで `mid` と `job_id` の紐付けを保存しておく必要がありますが、
        #   多くの場合はコンテキストに含まれるか、あるいは `mid` をキーにする設計変更が必要です。
        #   一旦、仕様書の `mid` またはパス等から `tid` が取れる前提、もしくは `mid` をキーに探す実装にします。

        # 修正: 仕様書例には `tid` がボディにない可能性があります。
        # もしボディに `tid` がない場合、Worker側で `job_id` を `mid` としても保存しておくか、
        # または外部APIが `tid` も返してくれるか確認が必要です。
        # ここでは「ボディに tid がある」または「クエリパラメータで渡す」前提で進めます。

        job_id = body.get("tid")
        # もしbodyにないならクエリパラメータから取得するのも安全です
        if not job_id:
            job_id = query_params.get("job_id") # Workerで callback_url に &job_id=... も付けておくと確実

        result_text = body.get("reply")

        # エラーハンドリング (外部APIでの生成失敗)
        status = "COMPLETED"
        if body.get("status") == "error":
            status = "FAILED"
            result_text = body.get("error")

        # DynamoDB更新
        table = dynamodb.Table(TABLE_NAME)
        update_expr = "SET #st = :st, #res = :res, updated_at = :ts"
        expr_names = {"#st": "status", "#res": "result"}
        expr_attrs = {
            ":st": status,
            ":res": result_text, # テキストまたはエラーオブジェクト
            ":ts": int(time.time())
        }

        table.update_item(
            Key={"tenant_id": tenant_id, "job_id": job_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_attrs
        )

        logger.info(f"Job {job_id} updated to {status}")
        return {"statusCode": 200, "body": "OK"}

    except Exception as e:
        logger.exception("Webhook processing failed")
        return {"statusCode": 500, "body": "Internal Server Error"}