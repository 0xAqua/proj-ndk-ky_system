import os
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    response = event.get("response", {})
    request = event.get("request", {})
    session = request.get("session", [])

    logger.info("認証チャレンジ定義を開始", action_category="LOGIN", session_length=len(session))

    # 1. 未開始 -> SRP_A
    if len(session) == 0:
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "SRP_A"

    # 2. SRP_A 成功 -> PASSWORD_VERIFIER
    elif session[-1].get("challengeName") == "SRP_A":
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "PASSWORD_VERIFIER"

    # 3. PASSWORD_VERIFIER 成功 -> CUSTOM_CHALLENGE (OTP)
    elif session[-1].get("challengeName") == "PASSWORD_VERIFIER":
        if session[-1].get("challengeResult") == True:
            response["issueTokens"] = False
            response["failAuthentication"] = False
            response["challengeName"] = "CUSTOM_CHALLENGE"
        else:
            response["issueTokens"] = False
            response["failAuthentication"] = True

    # 4. CUSTOM_CHALLENGE 判定 (★ここを修正)
    elif session[-1].get("challengeName") == "CUSTOM_CHALLENGE":
        # 成功時
        if session[-1].get("challengeResult") == True:
            logger.info("Phase 3: OTP認証成功", action_category="AUTH")
            response["issueTokens"] = True
            response["failAuthentication"] = False

        # 失敗 または 再送信("RESEND") の場合
        else:
            # これまでのOTP試行回数をカウント
            attempt_count = len([s for s in session if s["challengeName"] == "CUSTOM_CHALLENGE"])
            MAX_LOOPS = 4  # 3回ミス + 再送信などを許容する回数

            if attempt_count < MAX_LOOPS:
                # ★重要: 失敗にはせず、もう一度チャレンジさせる
                logger.info(f"Phase 3: 再試行ループ ({attempt_count}/{MAX_LOOPS})", action_category="AUTH")
                response["issueTokens"] = False
                response["failAuthentication"] = False
                response["challengeName"] = "CUSTOM_CHALLENGE"
            else:
                # 回数オーバーで本当に失敗
                logger.info("Phase 3: 試行回数上限により認証失敗", action_category="ERROR")
                response["issueTokens"] = False
                response["failAuthentication"] = True

    else:
        response["failAuthentication"] = True

    event["response"] = response
    return event