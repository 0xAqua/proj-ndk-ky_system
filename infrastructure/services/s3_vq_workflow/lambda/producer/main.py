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
from shared.operation_logger import log_vq_executed

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
TENANT_CONFIG_TABLE = os.environ.get('TENANT_CONFIG_TABLE')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(JOB_TABLE_NAME)
sqs = boto3.client('sqs')
secrets = boto3.client('secretsmanager')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

PROMPT_CONFIG = {
    "total_incidents": 3,
    "fact_incidents": 1,
    "countermeasures_per_case": 3
}


def build_ky_prompt(input_data: dict, tenant_id: str) -> str:
    """KY活動用プロンプトを構築"""
    cfg = get_prompt_config(tenant_id)

    type_names = input_data.get("typeNames", [])
    process_names = input_data.get("processNames", [])
    equipments = input_data.get("equipments", [])
    environment_items = input_data.get("environmentItems", [])

    # 入力データの整形
    type_names_str = "\n".join(type_names) if type_names else "(指定なし)"
    process_names_str = "\n".join(process_names) if process_names else "(指定なし)"
    equipments_str = "\n".join(f"-{e}" for e in equipments) if equipments else "(指定なし)"
    env_str = "\n".join(f"-{e}" for e in environment_items) if environment_items else "(特記事項なし)"

    # 対応策テンプレート
    countermeasures_template = ",\n        ".join([
        f'{{"no": {i+1}, "title": "", "description": "", "responsible": ""}}'
        for i in range(cfg["countermeasures_per_case"])
    ])

    # include_predicted_incidents による分岐
    if cfg.get("include_predicted_incidents", True):
        incident_instruction = f"""・類似状況のインシデントがない場合、推測できるインシデントとその対応策を記載
・登録されているドキュメントと同様インシデントについては（過去に起きたインシデント）と記載
・インシデントは合計{cfg["total_incidents"]}つ出力を行う
・出力するインシデントの中で同様のインシデントは{cfg["fact_incidents"]}つ"""
    else:
        incident_instruction = f"""・登録されているドキュメントに基づく過去事例のみを記載
・インシデントは合計{cfg["total_incidents"]}つ出力を行う
・全て過去に起きたインシデントとして記載"""

    return f"""以下の条件をもとに、類似状況で起こった過去のインシデントとその対応策を教えてください。
###条件
##実施する工事について
#工事概要
{type_names_str}
#本日の工事
{process_names_str}
#使用機材
{equipments_str}

##現場の状況について
#危険が予測される現場状況
{env_str}

###出力形式
##内容
{incident_instruction}
・１つのインシデントに対して対応策を{cfg["countermeasures_per_case"]}つ記載
・対応策は誰が実施すべきか、を明確にする
・対応策は実際の作業でどのように実施するかを具体的に記載
・対応策は実際の作業時に行えるものを記載する
##出力
・出力形式はJSONのみ
・説明文、補足文、Markdownは禁止
・以下のフォーマットに完全準拠すること
・キーの追加、削除、変更は禁止

#JSONフォーマット
{{
  "incidents": [
    {{
      "id": 1,
      "title": "",
      "classification": "過去に起きたインシデント | 推測されるインシデント",
      "summary": "",
      "cause": "",
      "countermeasures": [
        {countermeasures_template}
      ]
    }}
  ]
}}"""

def get_prompt_config(tenant_id: str) -> dict:
    """テナント別のプロンプト設定を取得"""
    config_table = dynamodb.Table(TENANT_CONFIG_TABLE)
    resp = config_table.get_item(Key={'tenant_id': tenant_id})
    item = resp.get('Item')

    if not item or 'prompt_config' not in item:
        raise Exception(f"Tenant config not found: {tenant_id}")

    config = {}
    for k, v in item['prompt_config'].items():
        if isinstance(v, Decimal):
            config[k] = int(v)
        else:
            config[k] = v
    return config

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
    try:
        body = json.loads(event.body or '{}')
        input_data = body.get('input', {})

        tenant_id = session.get('tenant_id')
        email = session.get('email')
        logger.append_keys(tenant_id=tenant_id, email=email)

        logger.info(f"Received input_data: {json.dumps(input_data, ensure_ascii=False)}")

        input_message = build_ky_prompt(input_data, tenant_id)
        logger.info(f"Generated prompt length: {len(input_message)}")


        tenant_id = session.get('tenant_id')
        email = session.get('email')  # ← 変更
        logger.append_keys(tenant_id=tenant_id, email=email)  # ← 変更

        # 1. VQ API 認証
        creds = get_vq_credentials(tenant_id)
        resp_auth = requests.post(AUTH_API_URL, json={"api_key": creds['api_key'], "login_id": creds['login_id']})
        if not resp_auth.ok:
            logger.error(f"Auth API error: {resp_auth.status_code} - {resp_auth.text}")
            return create_response(500, {"error": "Auth failed"}, origin)

        token = resp_auth.json().get('token')

        # 2. VQ API 実行
        vq_payload = {
            "message": input_message,
            "model_id": creds['model_id'],
            "callback_url": CALLBACK_URL
        }

        resp_vq = requests.post(MESSAGE_API_URL, json=vq_payload, headers={"Authorization": f"Bearer {token}"})

        if not resp_vq.ok:
            logger.error(f"VQ API error: {resp_vq.status_code} - {resp_vq.text}")
            return create_response(500, {"error": "VQ API error", "detail": resp_vq.text}, origin)

        vq_data = resp_vq.json()

        tid = vq_data.get('tid')
        mid = vq_data.get('mid')
        job_id = tid

        # 3. DynamoDB登録
        table.put_item(Item={
            'job_id': job_id,
            'tenant_id': tenant_id,
            'email': email,  # ← 変更（user_id, family_name, given_name を削除）
            'tid': tid,
            'mid': mid,
            'input_message': input_message,
            'type_names': input_data.get('typeNames', []),
            'process_names': input_data.get('processNames', []),
            'equipments': input_data.get('equipments', []),
            'environment_items': input_data.get('environmentItems', []),
            'status': 'PENDING',
            'retry_count': 0,
            'created_at': int(time.time()),
            'updated_at': int(time.time())
        })

        # 4. SQS送信
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps({
                'job_id': job_id,
                'tid': tid,
                'mid': mid,
                'tenant_id': tenant_id
            })
        )

        ip_address = event.request_context.http.source_ip if hasattr(event.request_context, 'http') else ""
        log_vq_executed(
            tenant_id=tenant_id,
            email=email,
            job_id=job_id,
            detail={
                "type_names": input_data.get('typeNames', []),
                "process_names": input_data.get('processNames', [])
            },
            ip_address=ip_address
        )

        return create_response(200, {"job_id": job_id, "message": "Job accepted"}, origin)

    except Exception as e:
        logger.exception(f"handle_post unexpected error: {str(e)}")
        return create_response(500, {"error": str(e)}, origin)


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
    raw_headers = {k.lower(): v for k, v in event.raw_event.get("headers", {}).items()}
    expected = os.environ.get("ORIGIN_VERIFY_SECRET")

    if expected and raw_headers.get("x-origin-verify") != expected:
        return {"statusCode": 403, "body": "Forbidden"}

    origin = raw_headers.get('origin', '')  # ← raw_headers を使う

    # 1. CSRFチェック
    if raw_headers.get('x-requested-with', '').lower() != 'xmlhttprequest':
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