import os
from datetime import datetime, timezone, timedelta
import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger
from utils.response import create_paginated_response, create_error_response

logger = Logger(child=True)
dynamodb = boto3.resource('dynamodb')
JST = timezone(timedelta(hours=+9), 'JST')

TABLE_NAME = os.environ.get('TENANT_VQ_MANAGER_TABLE')

def format_date(timestamp):
    """Unixタイムスタンプを日本時間の文字列に変換"""
    if not timestamp:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp), JST).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return None

def get_logs(event: dict, context, tenant_id: str, origin: str) -> dict:
    try:
        params = event.get('queryStringParameters') or {}

        # 1. フロントの Select (30, 50, 100) に対応
        try:
            limit = int(params.get('limit', 30))
            if limit not in [30, 50, 100]: limit = 30
        except ValueError:
            limit = 30

        # ページ番号（簡易的なオフセット用）
        try:
            page = int(params.get('page', 1))
            if page < 1: page = 1
        except ValueError:
            page = 1

        table = dynamodb.Table(TABLE_NAME)

        # 2. GSI (TenantDateIndex) を使用して Query
        # Scan ではなく Query を使うことで、他テナントの混入を防ぎつつ高速化
        query_args = {
            'IndexName': 'TenantDateIndex',
            'KeyConditionExpression': Key('tenant_id').eq(tenant_id),
            'ScanIndexForward': False,  # 最新順
            'Limit': limit * page       # 簡易的なページネーション対応
        }

        res = table.query(**query_args)
        all_items = res.get('Items', [])

        # 3. ページネーションのスライス処理
        # (DynamoDB本来の ExclusiveStartKey を使わない簡易的なページ分割)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = all_items[start_idx:end_idx]

        # 4. データの整形
        formatted_items = []
        for item in paginated_items:
            c_at = int(item.get('created_at', 0))
            u_at = int(item.get('updated_at', 0))

            formatted_items.append({
                'jobId': item.get('job_id'),
                'status': item.get('status'),
                'email': item.get('email'),
                'createdAt': format_date(c_at),
                'updatedAt': format_date(u_at),
                'durationSec': (u_at - c_at) if u_at > c_at else 0,
                # リストデータはフロントで Tooltip などに使うためそのまま渡す
                'typeNames': item.get('type_names', []),
                'processNames': item.get('process_names', [])
            })

        # 5. レスポンス生成（utils.response を使用）
        # ※total_items は、厳密にはテーブル全体のカウントが必要ですが、
        #   一旦は今回の取得件数で返します。
        return create_paginated_response(
            items=formatted_items,
            current_page=page,
            items_per_page=limit,
            total_items=limit * page if len(all_items) == limit * page else len(all_items),
            origin=origin
        )

    except Exception as e:
        logger.exception("Execution logs fetch error")
        return create_error_response(500, "履歴の取得に失敗しました", origin)