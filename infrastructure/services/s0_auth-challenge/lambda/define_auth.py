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

    logger.info("認証チャレンジ定義を開始", action_category="LOGIN", session_length=len(session))

    # 1. 未開始 -> SRP_A (SRPフロー開始)
    if len(session) == 0:
        logger.info("Phase 0: SRP_Aを開始", action_category="LOGIN")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "SRP_A"

    # 2. SRP_A 成功 -> PASSWORD_VERIFIER (パスワード検証へ)
    elif session[-1].get("challengeName") == "SRP_A":
        logger.info("Phase 1: SRP_A完了 → PASSWORD_VERIFIERへ", action_category="LOGIN")
        response["issueTokens"] = False
        response["failAuthentication"] = False
        response["challengeName"] = "PASSWORD_VERIFIER"

    # 3. PASSWORD_VERIFIER 成功 -> CUSTOM_CHALLENGE (OTPへ)
    elif session[-1].get("challengeName") == "PASSWORD_VERIFIER":
        if session[-1].get("challengeResult") == True:
            logger.info("Phase 2: パスワード検証成功 → OTPチャレンジへ", action_category="LOGIN")
            response["issueTokens"] = False
            response["failAuthentication"] = False
            response["challengeName"] = "CUSTOM_CHALLENGE"
        else:
            logger.info("Phase 2: パスワード検証失敗", action_category="ERROR")
            response["issueTokens"] = False
            response["failAuthentication"] = True

    # 4. CUSTOM_CHALLENGE 判定
    elif session[-1].get("challengeName") == "CUSTOM_CHALLENGE":
        # 成功した場合
        if session[-1].get("challengeResult") == True:
            logger.info("Phase 3: OTP認証成功 - トークン発行", action_category="AUTH")
            response["issueTokens"] = True
            response["failAuthentication"] = False

        # 失敗（または再送信リクエスト）の場合
        else:
            # 過去の CUSTOM_CHALLENGE の回数をカウント（今回を含める）
            attempt_count = len([s for s in session if s["challengeName"] == "CUSTOM_CHALLENGE"])
            MAX_LOOPS = 4  # 3回間違えるか、再送信を含めて合計4回まで許容

            if attempt_count < MAX_LOOPS:
                logger.info(f"Phase 3: 再試行/再送信 ({attempt_count}/{MAX_LOOPS})", action_category="AUTH")
                # ★重要: トークンは発行しないが、認証失敗にもしない
                response["issueTokens"] = False
                response["failAuthentication"] = False
                # ★重要: もう一度 CUSTOM_CHALLENGE を実行（→ create_challenge が走る）
                response["challengeName"] = "CUSTOM_CHALLENGE"
            else:
                logger.info("Phase 3: 試行回数上限により認証失敗", action_category="ERROR")
                response["issueTokens"] = False
                response["failAuthentication"] = True

    else:
        # 想定外の状態
        logger.error("想定外の認証状態", action_category="ERROR")
        response["failAuthentication"] = True

    event["response"] = response
    return event