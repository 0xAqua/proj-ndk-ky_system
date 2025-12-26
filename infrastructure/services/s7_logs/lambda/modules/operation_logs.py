"""
操作履歴（Operation History）取得
"""
import os
from datetime import datetime, timezone, timedelta
import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger
from utils.response import create_paginated_response, create_error_response

logger = Logger(child=True)
dynamodb = boto3.resource('dynamodb')

JST = timezone(timedelta(hours=+9), 'JST')
TABLE_NAME = os.environ.get('OPERATION_HISTORY_TABLE')


def format_date(timestamp_ms):
    """ミリ秒タイムスタンプを日本時間の文字列に変換"""
    if not timestamp_ms:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp_ms) / 1000, JST).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return None


def get_logs(event: dict, context, tenant_id: str, origin: str) -> dict:
    """操作履歴を取得"""
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

        # フィルターパラメータ
        search = params.get('search', '')
        category_filter = params.get('category', '')  # カンマ区切り
        action_filter = params.get('action', '')      # カンマ区切り

        table = dynamodb.Table(TABLE_NAME)

        # tenant_idでQuery（最新順）
        response = table.query(
            KeyConditionExpression=Key('tenant_id').eq(tenant_id),
            ScanIndexForward=False,  # 降順（最新が先）
            Limit=limit * page * 2   # フィルタ用に多めに取得
        )

        all_items = response.get('Items', [])

        # フィルタリング
        filtered_items = []
        categories = [c.strip() for c in category_filter.split(',') if c.strip()] if category_filter else []
        actions = [a.strip() for a in action_filter.split(',') if a.strip()] if action_filter else []

        for item in all_items:
            # カテゴリフィルタ
            if categories and item.get('category') not in categories:
                continue

            # アクションフィルタ
            if actions and item.get('action') not in actions:
                continue

            # 検索フィルタ（email, message, target_name）
            if search:
                search_lower = search.lower()
                email = (item.get('email') or '').lower()
                message = (item.get('message') or '').lower()
                target_name = (item.get('target_name') or '').lower()

                if not (search_lower in email or search_lower in message or search_lower in target_name):
                    continue

            filtered_items.append(item)

        # ページネーションのスライス
        total_items = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # フロント用に整形
        formatted_items = []
        for item in paginated_items:
            formatted_items.append({
                'email': item.get('email'),
                'category': item.get('category'),
                'action': item.get('action'),
                'targetType': item.get('target_type'),
                'targetName': item.get('target_name'),
                'message': item.get('message'),
                'ipAddress': item.get('ip_address', ''),
                'createdAt': format_date(item.get('created_at'))
            })

        return create_paginated_response(
            items=formatted_items,
            current_page=page,
            items_per_page=limit,
            total_items=total_items,
            origin=origin
        )

    except Exception as e:
        logger.exception("Operation logs fetch error")
        return create_error_response(500, "操作履歴の取得に失敗しました", origin)