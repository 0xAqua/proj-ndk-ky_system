"""
Create Auth Challenge Lambda
OTPコードを生成し、メール送信し、DynamoDBに保存
"""
import os
import json
import random
import time
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# AWS クライアント
ses = boto3.client("ses")
dynamodb = boto3.resource("dynamodb")

# 環境変数
OTP_TABLE_NAME = os.environ.get("OTP_TABLE_NAME")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
OTP_LENGTH = int(os.environ.get("OTP_LENGTH", "6"))
OTP_EXPIRY_SECONDS = int(os.environ.get("OTP_EXPIRY_SECONDS", "300"))  # 5分


def generate_otp(length: int = 6) -> str:
    """OTPコードを生成"""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


def delete_existing_otp(tenant_id: str, email: str) -> None:
    """既存のOTPレコードを削除（再送信時用）"""
    table = dynamodb.Table(OTP_TABLE_NAME)
    try:
        table.delete_item(
            Key={
                "tenant_id": tenant_id,
                "email": email,
            }
        )
        logger.info("既存OTPを削除しました", action_category="AUTH")
    except ClientError:
        pass  # 存在しない場合は無視


def save_otp_to_dynamodb(tenant_id: str, email: str, otp: str, user_id: str) -> None:
    """OTPコードをDynamoDBに保存"""
    table = dynamodb.Table(OTP_TABLE_NAME)

    current_time = int(time.time())
    expires_at = current_time + OTP_EXPIRY_SECONDS

    table.put_item(
        Item={
            "tenant_id": tenant_id,
            "email": email,
            "otp_code": otp,
            "user_id": user_id,
            "created_at": current_time,
            "expires_at": expires_at,
            "attempts": 0,
        }
    )
    logger.info("OTPをDynamoDBに保存しました", action_category="AUTH", expires_at=expires_at)


def send_otp_email(email: str, otp: str) -> None:
    """OTPコードをメールで送信"""
    subject = "【認証コード】ログイン確認"

    body_text = f"""ログイン認証コード

{otp}

このコードは{OTP_EXPIRY_SECONDS // 60}分間有効です。
心当たりのない場合は、このメールを無視してください。
"""

    ses.send_email(
        Source=SENDER_EMAIL,
        Destination={"ToAddresses": [email]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": body_text, "Charset": "UTF-8"},
            },
        },
    )
    logger.info("OTPメールを送信しました", action_category="AUTH", email=mask_email(email))


def mask_email(email: str) -> str:
    """メールアドレスをマスク（例: t***@example.com）"""
    if "@" not in email:
        return "***"

    local, domain = email.split("@")
    if len(local) <= 1:
        masked_local = "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 1)

    return f"{masked_local}@{domain}"


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    """
    OTPチャレンジの作成

    1. 既存OTP削除（再送信対応）
    2. OTPコード生成（6桁）
    3. DynamoDBに保存（TTL付き）
    4. SESでメール送信
    5. Cognitoにチャレンジパラメータを返却
    """
    request = event.get("request", {})
    user_attributes = request.get("userAttributes", {})

    # ユーザー情報取得
    email = user_attributes.get("email")
    user_id = user_attributes.get("sub")
    tenant_id = user_attributes.get("custom:tenant_id", "default")

    logger.append_keys(tenant_id=tenant_id, user_id=user_id)
    logger.info("OTPチャレンジ作成を開始", action_category="AUTH")

    if not email:
        logger.error("メールアドレスが見つかりません", action_category="ERROR")
        raise ValueError("Email is required for OTP authentication")

    try:
        # 1. 既存OTP削除（再送信時に古いOTPを無効化）
        delete_existing_otp(tenant_id, email)

        # 2. OTP生成
        otp = generate_otp(OTP_LENGTH)
        logger.info("OTPを生成しました", action_category="AUTH", otp_length=OTP_LENGTH)

        # 3. DynamoDBに保存
        save_otp_to_dynamodb(tenant_id, email, otp, user_id)

        # 4. メール送信
        send_otp_email(email, otp)

        # 5. レスポンス設定
        response = event.get("response", {})

        response["publicChallengeParameters"] = {
            "email": email,
            "maskedEmail": mask_email(email),
        }

        response["privateChallengeParameters"] = {
            "answer": otp,
            "tenant_id": tenant_id,
        }

        event["response"] = response
        logger.info("OTPチャレンジ作成完了", action_category="AUTH")

    except ClientError as e:
        logger.exception("AWSサービスエラーが発生しました", action_category="ERROR")
        raise
    except Exception as e:
        logger.exception("予期しないエラーが発生しました", action_category="ERROR")
        raise

    return event