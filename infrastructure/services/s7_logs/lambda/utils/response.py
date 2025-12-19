"""
レスポンス整形ユーティリティ (BFF対応版)
ページネーション付きレスポンスやエラーレスポンスを生成
"""
import json
from typing import List, Dict, Any
from math import ceil

def get_cors_headers(origin: str) -> Dict[str, str]:
    """BFF(Cookie認証)に必要な共通CORSヘッダーを生成"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,          # ★ 動的なOrigin指定
        'Access-Control-Allow-Credentials': 'true',     # ★ Cookie送信に必須
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    }

def create_paginated_response(
        items: List[Dict],
        current_page: int,
        items_per_page: int,
        total_items: int,
        origin: str = "*" # ★ originを追加
) -> Dict[str, Any]:
    """ページネーション付きレスポンスを生成"""
    total_pages = ceil(total_items / items_per_page) if total_items > 0 else 1
    has_next_page = current_page < total_pages
    has_previous_page = current_page > 1

    response_body = {
        'items': items,
        'pagination': {
            'currentPage': current_page,
            'itemsPerPage': items_per_page,
            'totalItems': total_items,
            'totalPages': total_pages,
            'hasNextPage': has_next_page,
            'hasPreviousPage': has_previous_page
        }
    }

    return {
        'statusCode': 200,
        'headers': get_cors_headers(origin), # ★ ヘッダーを統合
        'body': json.dumps(response_body, ensure_ascii=False)
    }

def create_success_response(data: Any, origin: str = "*", status_code: int = 200) -> Dict[str, Any]:
    """成功レスポンスを生成"""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(origin), # ★ ヘッダーを統合
        'body': json.dumps(data, ensure_ascii=False)
    }

def create_error_response(status_code: int, message: str, origin: str = "*", error_type: str = None) -> Dict[str, Any]:
    """エラーレスポンスを生成"""
    error_body = {
        'error': error_type or get_error_type(status_code),
        'message': message
    }

    return {
        'statusCode': status_code,
        'headers': get_cors_headers(origin), # ★ ヘッダーを統合
        'body': json.dumps(error_body, ensure_ascii=False)
    }

def get_error_type(status_code: int) -> str:
    """ステータスコードからエラータイプを取得"""
    error_types = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        503: 'Service Unavailable'
    }
    return error_types.get(status_code, 'Error')