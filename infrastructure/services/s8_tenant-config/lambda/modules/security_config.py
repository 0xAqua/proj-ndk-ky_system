import time
from aws_lambda_powertools import Logger

logger = Logger()


def create_response(status_code: int, body: dict) -> dict:
    """レスポンス生成"""
    import json
    from decimal import Decimal

    class DecimalEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, Decimal):
                if obj % 1 == 0:
                    return int(obj)
                return float(obj)
            return super(DecimalEncoder, self).default(obj)

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        },
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False)
    }


def get_default_security_config() -> dict:
    """デフォルトのセキュリティ設定"""
    return {
        "otp_enabled": False,
        "passkey_enabled": False
    }


def handle_get(config_table, tenant_id: str) -> dict:
    """セキュリティ設定を取得"""
    try:
        resp = config_table.get_item(Key={'tenant_id': tenant_id})
        item = resp.get('Item')

        if not item:
            return create_response(404, {"error": "Config not found"})

        # security_configが無い場合はデフォルト値を返す
        security_config = item.get("security_config", get_default_security_config())

        return create_response(200, {
            "tenant_id": item.get("tenant_id"),
            "security_config": security_config
        })

    except Exception as e:
        logger.exception(f"handle_get error: {str(e)}")
        return create_response(500, {"error": str(e)})


def handle_put(config_table, tenant_id: str, body: dict) -> dict:
    """セキュリティ設定を更新"""
    try:
        security_config = body.get('security_config')

        if not security_config:
            return create_response(400, {"error": "security_config is required"})

        # 許可されたキーのみ
        allowed_keys = {'otp_enabled', 'passkey_enabled'}
        if not set(security_config.keys()).issubset(allowed_keys):
            invalid_keys = set(security_config.keys()) - allowed_keys
            return create_response(400, {"error": f"Invalid keys: {invalid_keys}"})

        # バリデーション
        otp_enabled = security_config.get('otp_enabled')
        passkey_enabled = security_config.get('passkey_enabled')

        if otp_enabled is not None and not isinstance(otp_enabled, bool):
            return create_response(400, {"error": "otp_enabled must be a boolean"})

        if passkey_enabled is not None and not isinstance(passkey_enabled, bool):
            return create_response(400, {"error": "passkey_enabled must be a boolean"})

        # passkey有効時はOTPも強制有効（フロントでも制御するが念のため）
        if passkey_enabled and not otp_enabled:
            return create_response(400, {"error": "otp_enabled must be true when passkey_enabled is true"})

        now = int(time.time())

        # 既存チェック
        existing = config_table.get_item(Key={'tenant_id': tenant_id}).get('Item')

        if existing:
            # 更新
            config_table.update_item(
                Key={'tenant_id': tenant_id},
                UpdateExpression="SET security_config = :sc, updated_at = :ua",
                ExpressionAttributeValues={
                    ':sc': security_config,
                    ':ua': now
                }
            )
        else:
            # 新規作成
            config_table.put_item(Item={
                'tenant_id': tenant_id,
                'security_config': security_config,
                'created_at': now,
                'updated_at': now
            })

        return create_response(200, {
            "message": "Security config updated successfully",
            "tenant_id": tenant_id,
            "security_config": security_config
        })

    except Exception as e:
        logger.exception(f"handle_put error: {str(e)}")
        return create_response(500, {"error": str(e)})
