import os
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    """
    Define Auth Challenge Lambda (2要素認証版)
    Flow: SRP_A -> PASSWORD_VERIFIER -> CUSTOM_CHALLENGE -> Tokens
    """
    response = event.get("response", {})
    request = event.get("request", {})
    session = request.get("session", [])

    logger.info(f"Session length: {len(session)}")

    # 1. 未開始 -> SRP_A (SRPフロー開始)
    if len(session) == 0:
        logger.info("Phase 0: Start SRP_A")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "SRP_A"

    # 2. SRP_A 成功 -> PASSWORD_VERIFIER (パスワード検証へ)
    elif session[-1].get("challengeName") == "SRP_A":
        logger.info("Phase 1: SRP_A completed -> Next PASSWORD_VERIFIER")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "PASSWORD_VERIFIER"

    # 3. PASSWORD_VERIFIER 成功 -> CUSTOM_CHALLENGE (OTPへ)
    elif session[-1].get("challengeName") == "PASSWORD_VERIFIER":
        if session[-1].get("challengeResult") == True:
            logger.info("Phase 2: Password verified -> Next CUSTOM_CHALLENGE")
            response["issueTokens"] = False
            response["failAuthentication"] = False
            response["challengeName"] = "CUSTOM_CHALLENGE"
        else:
            logger.info("Phase 2: Password failed")
            response["issueTokens"] = False
            response["failAuthentication"] = True

    # 4. CUSTOM_CHALLENGE 判定
    elif session[-1].get("challengeName") == "CUSTOM_CHALLENGE":
        if session[-1].get("challengeResult") == True:
            # OTP正解！ -> トークン発行
            logger.info("Phase 3: OTP Succeeded - Issuing tokens")
            response["issueTokens"] = True
            response["failAuthentication"] = False
        else:
            # OTP間違い
            logger.info("Phase 3: OTP Failed")
            response["issueTokens"] = False
            response["failAuthentication"] = True

    else:
        # 想定外の状態
        response["failAuthentication"] = True

    event["response"] = response
    return event