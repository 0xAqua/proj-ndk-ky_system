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


def handle_get(config_table, tenant_id: str) -> dict:
    """プロンプト設定を取得"""
    try:
        resp = config_table.get_item(Key={'tenant_id': tenant_id})
        item = resp.get('Item')

        if not item:
            return create_response(404, {"error": "Config not found"})

        return create_response(200, {
            "tenant_id": item.get("tenant_id"),
            "prompt_config": item.get("prompt_config", {})
        })

    except Exception as e:
        logger.exception(f"handle_get error: {str(e)}")
        return create_response(500, {"error": str(e)})


def handle_put(config_table, tenant_id: str, body: dict) -> dict:
    """プロンプト設定を更新"""
    try:
        prompt_config = body.get('prompt_config')

        if not prompt_config:
            return create_response(400, {"error": "prompt_config is required"})

        # バリデーション
        required_keys = ['total_incidents', 'fact_incidents', 'countermeasures_per_case', 'include_predicted_incidents']
        for key in required_keys:
            if key not in prompt_config:
                return create_response(400, {"error": f"Missing required key: {key}"})

        # 数値バリデーション
        if not isinstance(prompt_config.get('total_incidents'), int) or prompt_config['total_incidents'] < 1:
            return create_response(400, {"error": "total_incidents must be a positive integer"})

        if not isinstance(prompt_config.get('fact_incidents'), int) or prompt_config['fact_incidents'] < 0:
            return create_response(400, {"error": "fact_incidents must be a non-negative integer"})

        if not isinstance(prompt_config.get('countermeasures_per_case'), int) or prompt_config['countermeasures_per_case'] < 1:
            return create_response(400, {"error": "countermeasures_per_case must be a positive integer"})

        if not isinstance(prompt_config.get('include_predicted_incidents'), bool):
            return create_response(400, {"error": "include_predicted_incidents must be a boolean"})

        # fact_incidents <= total_incidents チェック
        if prompt_config['fact_incidents'] > prompt_config['total_incidents']:
            return create_response(400, {"error": "fact_incidents cannot exceed total_incidents"})

        now = int(time.time())

        # 既存チェック
        existing = config_table.get_item(Key={'tenant_id': tenant_id}).get('Item')

        if existing:
            # 更新
            config_table.update_item(
                Key={'tenant_id': tenant_id},
                UpdateExpression="SET prompt_config = :pc, updated_at = :ua",
                ExpressionAttributeValues={
                    ':pc': prompt_config,
                    ':ua': now
                }
            )
        else:
            # 新規作成
            config_table.put_item(Item={
                'tenant_id': tenant_id,
                'prompt_config': prompt_config,
                'created_at': now,
                'updated_at': now
            })

        return create_response(200, {
            "message": "Config updated successfully",
            "tenant_id": tenant_id,
            "prompt_config": prompt_config
        })

    except Exception as e:
        logger.exception(f"handle_put error: {str(e)}")
        return create_response(500, {"error": str(e)})