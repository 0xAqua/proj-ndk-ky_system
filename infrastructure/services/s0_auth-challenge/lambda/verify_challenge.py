"""
Verify Auth Challenge Lambda
ユーザーが入力したOTPコードを検証
"""
import os
import time
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# AWS クライアント
dynamodb = boto3.resource("dynamodb")

# 環境変数
OTP_TABLE_NAME = os.environ.get("OTP_TABLE_NAME")
MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS", "3"))


def get_otp_from_dynamodb(tenant_id: str, email: str) -> dict | None:
    """DynamoDBからOTPレコードを取得"""
    table = dynamodb.Table(OTP_TABLE_NAME)

    try:
        response = table.get_item(
            Key={
                "tenant_id": tenant_id,
                "email": email,
            }
        )
        return response.get("Item")
    except ClientError:
        logger.exception("DynamoDBからOTP取得に失敗しました", action_category="ERROR")
        return None


def increment_attempts(tenant_id: str, email: str) -> None:
    """試行回数をインクリメント"""
    table = dynamodb.Table(OTP_TABLE_NAME)

    try:
        table.update_item(
            Key={
                "tenant_id": tenant_id,
                "email": email,
            },
            UpdateExpression="SET attempts = attempts + :inc",
            ExpressionAttributeValues={":inc": 1},
        )
    except ClientError:
        logger.exception("試行回数の更新に失敗しました", action_category="ERROR")


def delete_otp(tenant_id: str, email: str) -> None:
    """OTPレコードを削除（認証成功後）"""
    table = dynamodb.Table(OTP_TABLE_NAME)

    try:
        table.delete_item(
            Key={
                "tenant_id": tenant_id,
                "email": email,
            }
        )
        logger.info("OTPレコードを削除しました", action_category="AUTH")
    except ClientError:
        logger.exception("OTPレコードの削除に失敗しました", action_category="ERROR")


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=False)
def lambda_handler(event, context):
    """
    OTPコードの検証
    """
    request = event.get("request", {})
    # ★修正: responseの初期化を一番上に移動
    response = event.get("response", {})

    user_attributes = request.get("userAttributes", {})

    # ユーザー情報
    email = user_attributes.get("email")
    tenant_id = user_attributes.get("custom:tenant_id", "default")
    user_id = user_attributes.get("sub")

    logger.append_keys(tenant_id=tenant_id, user_id=user_id)

    # ユーザーが入力したOTP
    user_answer = request.get("challengeAnswer", "").strip()

    # ★追加: 再送信リクエストの検知
    if user_answer == "RESEND":
        logger.info("再送信リクエストを受信しました", action_category="AUTH")
        # 認証は「失敗」扱いにすることで define_auth に戻すが
        # DynamoDBの試行回数は増やさない
        response["answerCorrect"] = False
        event["response"] = response
        return event

    # privateChallengeParameters から期待値を取得（バックアップ）
    private_params = request.get("privateChallengeParameters", {})
    expected_answer = private_params.get("answer")

    logger.info("OTP検証を開始", action_category="AUTH")

    answer_correct = False

    try:
        # DynamoDBから保存されたOTPを取得
        otp_record = get_otp_from_dynamodb(tenant_id, email)

        if not otp_record:
            logger.warning("OTPレコードが見つかりません", action_category="ERROR")
            response["answerCorrect"] = False
            event["response"] = response
            return event

        stored_otp = otp_record.get("otp_code")
        expires_at = otp_record.get("expires_at", 0)
        attempts = otp_record.get("attempts", 0)
        current_time = int(time.time())

        # 有効期限チェック
        if current_time > expires_at:
            logger.warning("OTPの有効期限が切れています", action_category="ERROR")
            delete_otp(tenant_id, email)
            response["answerCorrect"] = False
            event["response"] = response
            return event

        # 試行回数チェック
        if attempts >= MAX_ATTEMPTS:
            logger.warning("試行回数の上限を超えました", action_category="ERROR", max_attempts=MAX_ATTEMPTS)
            delete_otp(tenant_id, email)
            response["answerCorrect"] = False
            event["response"] = response
            return event

        # OTP一致チェック（DynamoDB優先、なければprivateChallengeParameters）
        if stored_otp and user_answer == stored_otp:
            answer_correct = True
            logger.info("OTP検証成功（DynamoDB）", action_category="AUTH")
        elif expected_answer and user_answer == expected_answer:
            answer_correct = True
            logger.info("OTP検証成功（privateChallengeParameters）", action_category="AUTH")
        else:
            logger.warning("OTP検証失敗 - コード不一致", action_category="ERROR")
            increment_attempts(tenant_id, email)

        if answer_correct:
            # 成功時はOTPレコードを削除
            delete_otp(tenant_id, email)

    except Exception as e:
        logger.exception("OTP検証中にエラーが発生しました", action_category="ERROR")
        answer_correct = False

    response["answerCorrect"] = answer_correct
    event["response"] = response

    return event