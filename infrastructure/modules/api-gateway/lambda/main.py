"""
Origin Verify Lambda Authorizer
CloudFront経由のリクエストのみを許可する軽量Authorizer
"""
import os

def lambda_handler(event, context):
    """
    X-Origin-Verify ヘッダーを検証
    - 一致: isAuthorized=True（Lambda本体を実行）
    - 不一致: isAuthorized=False（403を返却、Lambda本体は実行されない）
    """
    expected_secret = os.environ.get("ORIGIN_VERIFY_SECRET", "")

    # HTTP API v2 の場合、headers は小文字で正規化されている
    headers = event.get("headers", {})
    provided_secret = headers.get("x-origin-verify", "")

    if expected_secret and provided_secret == expected_secret:
        return {"isAuthorized": True}

    return {"isAuthorized": False}