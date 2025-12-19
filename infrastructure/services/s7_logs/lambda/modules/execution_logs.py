"""
実行履歴取得モジュール
tenant_vq_managerから実行履歴を取得し、ユーザー名を解決して返す
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from utils.response import create_paginated_response, create_error_response

logger = Logger(child=True)

# DynamoDB初期化
dynamodb = boto3.resource('dynamodb')
vq_manager_table = dynamodb.Table(os.environ['TENANT_VQ_MANAGER_TABLE'])
user_master_table = dynamodb.Table(os.environ['TENANT_USER_MASTER_TABLE'])


def get_logs(event: dict, context: LambdaContext, tenant_id: str, origin: str) -> dict:
    try:
        params = event.get('queryStringParameters') or {}

        # ページネーション等のパラメータ取得ロジックはそのまま維持
        try:
            limit = int(params.get('limit', 30))
            if limit not in [30, 50, 100]: limit = 30
        except ValueError: limit = 30

        try:
            page = int(params.get('page', 1))
            if page < 1: page = 1
        except ValueError: page = 1

        start_date = params.get('startDate')
        end_date = params.get('endDate')

        logger.info(f"Fetching execution logs: tenant_id={tenant_id}, limit={limit}, page={page}")

        # 1. 実行履歴を取得 (引数には認証済みの tenant_id を使用)
        items = fetch_execution_logs(
            tenant_id=tenant_id,
            limit=limit,
            page=page,
            start_date=start_date,
            end_date=end_date
        )

        # 2. ユーザー名を解決 & 整形
        items_with_users = resolve_user_names(tenant_id, items)
        formatted_items = [format_log_item(item) for item in items_with_users]
        total_items = estimate_total_items(tenant_id, limit, len(formatted_items))

        # 3. 成功レスポンスの生成
        response = create_paginated_response(
            items=formatted_items,
            current_page=page,
            items_per_page=limit,
            total_items=total_items
        )

        # ★ 重要: BFF(Cookie認証)用のCORSヘッダーを追加
        if "headers" not in response: response["headers"] = {}
        response["headers"].update({
            "Access-Control-Allow-Origin": origin,         # ★ 動的にOriginを返す
            "Access-Control-Allow-Credentials": "true",    # ★ Cookie使用時は必須
            "Content-Type": "application/json"
        })

        return response

    except Exception as e:
        logger.exception("Error in get_logs")
        # エラー時も CORS ヘッダーがないとブラウザで詳細が見られないため同様に処理
        err_res = create_error_response(500, f"Internal server error")
        if "headers" not in err_res: err_res["headers"] = {}
        err_res["headers"].update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        })
        return err_res


def fetch_execution_logs(
        tenant_id: str,
        limit: int,
        page: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
) -> List[Dict]:
    """
    DynamoDBから実行履歴を取得
    """
    try:
        # Scanでtenant_idフィルタリング
        # 注意: 本番環境ではGSIを作成してQueryを使う方が効率的
        filter_expression = Attr('tenant_id').eq(tenant_id)

        # 日付範囲フィルタ追加
        if start_date:
            start_timestamp = int(datetime.fromisoformat(start_date.replace('Z', '+00:00')).timestamp())
            filter_expression = filter_expression & Attr('created_at').gte(start_timestamp)

        if end_date:
            end_timestamp = int(datetime.fromisoformat(end_date.replace('Z', '+00:00')).timestamp())
            filter_expression = filter_expression & Attr('created_at').lte(end_timestamp)

        # Scan実行
        response = vq_manager_table.scan(
            FilterExpression=filter_expression,
            Limit=limit * page  # ページ分を考慮して多めに取得
        )

        items = response.get('Items', [])

        # created_atで降順ソート(最新が先)
        items.sort(key=lambda x: x.get('created_at', 0), reverse=True)

        # ページネーション
        start_index = (page - 1) * limit
        end_index = start_index + limit
        paginated_items = items[start_index:end_index]

        logger.info(f"Fetched {len(paginated_items)} items (page {page})")

        return paginated_items

    except Exception as e:
        logger.exception("Error fetching execution logs")
        raise


def resolve_user_names(tenant_id: str, items: List[Dict]) -> List[Dict]:
    """
    ユーザーIDからユーザー名を解決
    """
    if not items:
        return items

    try:
        # user_idを抽出(重複削除)
        user_ids = list(set([
            item.get('user_id')
            for item in items
            if item.get('user_id')
        ]))

        if not user_ids:
            return items

        logger.info(f"Resolving {len(user_ids)} user names")

        # BatchGetItemでユーザー情報を一括取得
        users_map = batch_get_users(tenant_id, user_ids)

        # ユーザー名をマージ
        for item in items:
            user_id = item.get('user_id')
            if user_id and user_id in users_map:
                user = users_map[user_id]
                family_name = user.get('family_name', '')
                given_name = user.get('given_name', '')
                item['user_name'] = f"{family_name} {given_name}".strip() or 'Unknown'
            else:
                item['user_name'] = 'Unknown'

        return items

    except Exception as e:
        logger.exception("Error resolving user names")
        # エラー時はユーザー名なしで続行
        for item in items:
            item['user_name'] = 'Unknown'
        return items


def batch_get_users(tenant_id: str, user_ids: List[str]) -> Dict[str, Dict]:
    """
    BatchGetItemでユーザー情報を一括取得
    """
    try:
        # BatchGetItemは最大100件まで
        users_map = {}

        # 100件ずつバッチ処理
        for i in range(0, len(user_ids), 100):
            batch_user_ids = user_ids[i:i+100]

            keys = [
                {'tenant_id': tenant_id, 'user_id': uid}
                for uid in batch_user_ids
            ]

            response = dynamodb.batch_get_item(
                RequestItems={
                    os.environ['TENANT_USER_MASTER_TABLE']: {
                        'Keys': keys
                    }
                }
            )

            users = response.get('Responses', {}).get(
                os.environ['TENANT_USER_MASTER_TABLE'], []
            )

            for user in users:
                users_map[user['user_id']] = user

        return users_map

    except Exception as e:
        logger.exception("Error in batch_get_users")
        return {}


def format_log_item(item: Dict) -> Dict:
    """
    ログアイテムをフロントエンド用にフォーマット
    """
    created_at = item.get('created_at')
    updated_at = item.get('updated_at')

    # ISO8601形式に変換
    created_at_iso = datetime.fromtimestamp(created_at).isoformat() + 'Z' if created_at else None
    updated_at_iso = datetime.fromtimestamp(updated_at).isoformat() + 'Z' if updated_at else None

    # 実行時間を計算(秒)
    duration = None
    if created_at and updated_at:
        duration = int(updated_at - created_at)

    return {
        'jobId': item.get('job_id'),
        'status': item.get('status'),
        'userName': item.get('user_name', 'Unknown'),
        'createdAt': created_at_iso,
        'updatedAt': updated_at_iso,
        'duration': duration,
        'errorMsg': item.get('error_msg')
    }


def estimate_total_items(tenant_id: str, limit: int, fetched_count: int) -> int:
    """
    全件数を推定
    注: 正確な値が必要な場合は、別途Countクエリやキャッシュが必要
    """
    # 簡易実装: フェッチした件数がlimitと同じなら、さらにデータがある可能性
    if fetched_count == limit:
        # 仮に3ページ分あると仮定
        return limit * 3
    else:
        return fetched_count