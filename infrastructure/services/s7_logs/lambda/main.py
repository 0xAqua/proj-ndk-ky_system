"""
S7 Logs Service - Main Handler
ログ取得APIのルーティング処理
"""
import json
import os
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from modules import execution_logs

logger = Logger()


@logger.inject_lambda_context
def handler(event: dict, context: LambdaContext) -> dict:
    """
    Lambda Handler
    パスに応じて適切なモジュールにルーティング
    """
    try:
        # リクエストパスを取得
        path = event.get('rawPath', event.get('path', ''))
        method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')

        logger.info(f"Request: {method} {path}")

        # ルーティング
        if path == '/logs/execution' and method == 'GET':
            return execution_logs.get_logs(event, context)

        # 未実装のエンドポイント
        elif path == '/logs/operation' and method == 'GET':
            return {
                'statusCode': 501,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Not Implemented',
                    'message': 'Operation logs endpoint is not yet implemented'
                })
            }

        elif path == '/logs/access' and method == 'GET':
            return {
                'statusCode': 501,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Not Implemented',
                    'message': 'Access logs endpoint is not yet implemented'
                })
            }

        # 404 Not Found
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Not Found',
                    'message': f'Path {path} not found'
                })
            }

    except Exception as e:
        logger.exception("Unhandled error in handler")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            })
        }