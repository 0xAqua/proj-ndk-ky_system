import os
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context):
    """
    Define Auth Challenge Lambda (2要素認証版)
    Flow: Password (SRP) -> Custom Challenge (Email OTP) -> Tokens
    """
    response = event.get("response", {})
    request = event.get("request", {})
    session = request.get("session", [])

    logger.info(f"Session length: {len(session)}")

    # 1. 最初のアクセス、またはSRP認証の途中
    # セッションが空、または最後のチャレンジがSRP関連の場合は、Cognito標準のSRPフローを継続させる
    if len(session) == 0:
        # まだ何も始まっていない -> SRP認証へ
        logger.info("Phase 1: Start SRP Auth")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "SRP_A"

    elif session[-1].get("challengeName") in ["SRP_A", "PASSWORD_VERIFIER"]:
        # SRP認証の計算中、またはパスワード検証直後
        if session[-1].get("challengeResult") == True:
            # パスワード認証成功！ -> 次はカスタムOTPへ進む
            logger.info("Phase 2: Password Verified - Presenting Custom Challenge (OTP)")
            response["issueTokens"] = False
            response["failAuthentication"] = False
            response["challengeName"] = "CUSTOM_CHALLENGE"
        else:
            # パスワード間違いなど
            logger.info("Phase 1: SRP Failed")
            response["issueTokens"] = False
            response["failAuthentication"] = False # クライアントに再試行させるためFalseのままが多いが、ここはお任せ

    # 2. OTP入力後
    elif session[-1].get("challengeName") == "CUSTOM_CHALLENGE":
        if session[-1].get("challengeResult") == True:
            # OTP正解！ -> トークン発行（ログイン成功）
            logger.info("Phase 3: OTP Succeeded - Issuing tokens")
            response["issueTokens"] = True
            response["failAuthentication"] = False
        else:
            # OTP間違い
            logger.info("Phase 3: OTP Failed")
            response["issueTokens"] = False
            response["failAuthentication"] = True # ここで失敗確定させる

    else:
        # 想定外の状態
        response["failAuthentication"] = True

    event["response"] = response
    return event