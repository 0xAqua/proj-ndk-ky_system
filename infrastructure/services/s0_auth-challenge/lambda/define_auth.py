"""
Define Auth Challenge Lambda
認証フローの制御

BFFからCUSTOM_AUTHで呼ばれる前提:
- パスワード検証はBFF側でADMIN_USER_PASSWORD_AUTH済み
- このLambdaはOTP認証のみを担当
"""
import os
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

# 最大試行回数（再送信含む）
MAX_OTP_ATTEMPTS = int(os.environ.get("MAX_OTP_ATTEMPTS", "5"))


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    response = event.get("response", {})
    request = event.get("request", {})
    session = request.get("session", [])

    logger.info(
        "認証チャレンジ定義を開始",
        action_category="AUTH",
        session_length=len(session)
    )

    # ──────────────────────────────────────────────────────────
    # 1. 初回: CUSTOM_CHALLENGEを発行（OTP送信）
    # ──────────────────────────────────────────────────────────
    if len(session) == 0:
        logger.info("Phase 1: OTPチャレンジ開始", action_category="AUTH")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "CUSTOM_CHALLENGE"

    # ──────────────────────────────────────────────────────────
    # 2. CUSTOM_CHALLENGE の結果判定
    # ──────────────────────────────────────────────────────────
    elif session[-1].get("challengeName") == "CUSTOM_CHALLENGE":
        challenge_result = session[-1].get("challengeResult")

        if challenge_result == True:
            # OTP認証成功 → トークン発行
            logger.info("OTP認証成功 - トークン発行", action_category="AUTH")
            response["issueTokens"] = True
            response["failAuthentication"] = False

        else:
            # OTP認証失敗 or 再送信リクエスト
            attempt_count = len([
                s for s in session
                if s.get("challengeName") == "CUSTOM_CHALLENGE"
            ])

            if attempt_count < MAX_OTP_ATTEMPTS:
                # 再試行を許可
                logger.info(
                    f"OTP再試行 ({attempt_count}/{MAX_OTP_ATTEMPTS})",
                    action_category="AUTH"
                )
                response["issueTokens"] = False
                response["failAuthentication"] = False
                response["challengeName"] = "CUSTOM_CHALLENGE"
            else:
                # 試行回数上限 → 認証失敗
                logger.warning(
                    "OTP試行回数上限により認証失敗",
                    action_category="AUTH",
                    attempt_count=attempt_count
                )
                response["issueTokens"] = False
                response["failAuthentication"] = True

    # ──────────────────────────────────────────────────────────
    # 3. 想定外のチャレンジ → 失敗
    # ──────────────────────────────────────────────────────────
    else:
        logger.error(
            "想定外のチャレンジ",
            action_category="ERROR",
            challenge_name=session[-1].get("challengeName") if session else None
        )
        response["issueTokens"] = False
        response["failAuthentication"] = True

    event["response"] = response
    return event