"""
アクセス履歴（Cognitoログイン履歴）
- save_log: CloudWatch Logs Subscription Filter から呼ばれる保存処理
- get_logs: API Gateway から呼ばれる取得処理
"""
import os
import json
import base64
import gzip
import time
from datetime import datetime, timezone, timedelta
import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger
from utils.response import create_paginated_response, create_error_response

logger = Logger(child=True)
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

JST = timezone(timedelta(hours=+9), 'JST')
TABLE_NAME = os.environ.get('ACCESS_HISTORY_TABLE')
USER_POOL_ID = os.environ.get('USER_POOL_ID')
TTL_DAYS = 90


# ─────────────────────────────
# 保存処理（CloudWatch Logs → DynamoDB）
# ─────────────────────────────
def get_user_info(user_sub: str) -> dict:
    """Cognitoからユーザーのemailとtenant_idを取得"""
    try:
        response = cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=user_sub
        )

        email = None
        tenant_id = None

        for attr in response.get('UserAttributes', []):
            if attr['Name'] == 'email':
                email = attr['Value']
            elif attr['Name'] == 'custom:tenant_id':
                tenant_id = attr['Value']

        return {'email': email, 'tenant_id': tenant_id}

    except cognito.exceptions.UserNotFoundException:
        logger.warning(f"User not found: {user_sub}")
        return {'email': None, 'tenant_id': None}
    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        return {'email': None, 'tenant_id': None}


def save_logs(event: dict) -> dict:
    """CloudWatch Logsからのイベントを処理してDynamoDBに保存"""

    # 1. CloudWatch Logsのデータをデコード
    compressed_data = base64.b64decode(event['awslogs']['data'])
    log_data = json.loads(gzip.decompress(compressed_data))

    log_events = log_data.get('logEvents', [])
    logger.info(f"Processing {len(log_events)} events")

    table = dynamodb.Table(TABLE_NAME)
    saved_count = 0

    for log_event in log_events:
        try:
            # ログメッセージをパース
            message_str = log_event.get('message', '{}')
            log_data = json.loads(message_str)
            event_message = log_data.get('message', {})

            user_sub = event_message.get('userSub')
            if not user_sub:
                continue

            # ユーザー情報を取得
            user_info = get_user_info(user_sub)
            if not user_info['tenant_id']:
                logger.warning(f"No tenant_id for user: {user_sub}")
                continue

            event_id = event_message.get('eventId', '')
            timestamp = int(event_message.get('eventTimestamp', log_event.get('timestamp', 0)))
            expires_at = int(time.time()) + (TTL_DAYS * 24 * 60 * 60)

            # DynamoDBに保存
            item = {
                'tenant_id': user_info['tenant_id'],
                'timestamp_event_id': f"{timestamp}#{event_id}",
                'email': user_info['email'] or 'unknown',
                'user_sub': user_sub,
                'event_type': event_message.get('eventType', 'Unknown'),
                'result': event_message.get('eventResponse', 'Unknown'),
                'ip_address': event_message.get('ipAddress', ''),
                'city': event_message.get('city', ''),
                'country': event_message.get('country', ''),
                'risk_level': event_message.get('riskLevel', ''),
                'created_at': timestamp,
                'expires_at': expires_at
            }

            table.put_item(Item=item)
            saved_count += 1

        except Exception as e:
            logger.error(f"Failed to process log event: {e}")
            continue

    logger.info(f"Saved {saved_count} events")
    return {'statusCode': 200, 'body': json.dumps({'saved': saved_count})}


# ─────────────────────────────
# 取得処理（API Gateway → フロント）
# ─────────────────────────────
def format_date(timestamp_ms):
    """ミリ秒タイムスタンプを日本時間の文字列に変換"""
    if not timestamp_ms:
        return None
    try:
        # Cognitoはミリ秒なので1000で割る
        return datetime.fromtimestamp(int(timestamp_ms) / 1000, JST).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return None


def get_logs(event: dict, context, tenant_id: str, origin: str) -> dict:
    """アクセス履歴を取得"""
    try:
        params = event.get('queryStringParameters') or {}

        # ページネーションパラメータ
        try:
            limit = int(params.get('limit', 30))
            if limit not in [30, 50, 100]:
                limit = 30
        except ValueError:
            limit = 30

        try:
            page = int(params.get('page', 1))
            if page < 1:
                page = 1
        except ValueError:
            page = 1

        table = dynamodb.Table(TABLE_NAME)

        # tenant_idでQuery（最新順）
        response = table.query(
            KeyConditionExpression=Key('tenant_id').eq(tenant_id),
            ScanIndexForward=False,  # 降順（最新が先）
            Limit=limit * page
        )

        all_items = response.get('Items', [])

        # ページネーションのスライス
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = all_items[start_idx:end_idx]

        # フロント用に整形
        formatted_items = []
        for item in paginated_items:
            formatted_items.append({
                'email': item.get('email'),
                'eventType': item.get('event_type'),
                'result': item.get('result'),
                'ipAddress': item.get('ip_address'),
                'city': item.get('city'),
                'country': item.get('country'),
                'riskLevel': item.get('risk_level'),
                'createdAt': format_date(item.get('created_at'))
            })

        return create_paginated_response(
            items=formatted_items,
            current_page=page,
            items_per_page=limit,
            total_items=len(all_items),
            origin=origin
        )

    except Exception as e:
        logger.exception("Access logs fetch error")
        return create_error_response(500, "アクセス履歴の取得に失敗しました", origin)