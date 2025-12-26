"""
操作履歴ロガー
各Lambdaから呼び出して操作履歴をDynamoDBに記録する
"""
import os
import time
import uuid
import json
import boto3
from aws_lambda_powertools import Logger

logger = Logger(child=True)
dynamodb = boto3.resource('dynamodb')

# TTL: 1年
TTL_DAYS = 365


# ─────────────────────────────
# 定数定義
# ─────────────────────────────
class Category:
    USER = "USER"
    VQ = "VQ"
    CONFIG = "CONFIG"
    DATA = "DATA"


class Action:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    VIEW = "VIEW"
    EXECUTE = "EXECUTE"


# ─────────────────────────────
# メッセージテンプレート
# ─────────────────────────────
MESSAGE_TEMPLATES = {
    # USER
    (Category.USER, Action.CREATE): "ユーザー {target_name} を作成しました",
    (Category.USER, Action.UPDATE): "ユーザー {target_name} を更新しました",
    (Category.USER, Action.DELETE): "ユーザー {target_name} を削除しました",
    (Category.USER, Action.EXECUTE): "ユーザー {target_name} のパスワードをリセットしました",

    # VQ
    (Category.VQ, Action.EXECUTE): "VQを実行しました",
    (Category.VQ, Action.VIEW): "VQ実行結果を確認しました",

    # CONFIG
    (Category.CONFIG, Action.UPDATE): "{target_name}を更新しました",

    # DATA
    (Category.DATA, Action.UPDATE): "{target_name}を更新しました",
    (Category.DATA, Action.VIEW): "{target_name}をダウンロードしました",
}


def generate_message(category: str, action: str, target_name: str = "") -> str:
    """カテゴリとアクションからメッセージを生成"""
    template = MESSAGE_TEMPLATES.get((category, action), "{target_name}に対して操作を実行しました")
    return template.format(target_name=target_name or "対象")


# ─────────────────────────────
# メイン関数
# ─────────────────────────────
def log_operation(
        tenant_id: str,
        email: str,
        category: str,
        action: str,
        target_type: str,
        target_id: str = "",
        target_name: str = "",
        detail: dict = None,
        ip_address: str = "",
        user_agent: str = "",
        message: str = None,
) -> bool:
    """
    操作履歴を記録する

    Args:
        tenant_id: テナントID
        email: 操作者のメールアドレス
        category: カテゴリ (USER / VQ / CONFIG / DATA)
        action: アクション (CREATE / UPDATE / DELETE / VIEW / EXECUTE)
        target_type: 対象の種類 (user / vq_job / prompt / security / csv)
        target_id: 対象のID（オプション）
        target_name: 対象の表示名（オプション）
        detail: 追加情報（オプション）
        ip_address: 操作元IP（オプション）
        user_agent: User-Agent（オプション）
        message: カスタムメッセージ（省略時は自動生成）

    Returns:
        成功時True、失敗時False
    """
    table_name = os.environ.get('OPERATION_HISTORY_TABLE')
    if not table_name:
        logger.warning("OPERATION_HISTORY_TABLE is not set, skipping operation log")
        return False

    try:
        table = dynamodb.Table(table_name)

        now_ms = int(time.time() * 1000)
        event_id = str(uuid.uuid4())
        expires_at = int(time.time()) + (TTL_DAYS * 24 * 60 * 60)

        # メッセージ生成
        final_message = message or generate_message(category, action, target_name)

        item = {
            # Keys
            'tenant_id': tenant_id,
            'timestamp_id': f"{now_ms}#{event_id}",

            # フィルター用
            'category': category,
            'action': action,

            # 詳細
            'email': email,
            'target_type': target_type,
            'target_id': target_id,
            'target_name': target_name,
            'message': final_message,

            # メタ
            'created_at': now_ms,
            'expires_at': expires_at,
        }

        # オプション項目
        if detail:
            item['detail'] = json.dumps(detail, ensure_ascii=False)
        if ip_address:
            item['ip_address'] = ip_address
        if user_agent:
            item['user_agent'] = user_agent

        table.put_item(Item=item)
        logger.info(f"Operation logged: {category}/{action} by {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to log operation: {e}")
        return False


# ─────────────────────────────
# ヘルパー関数
# ─────────────────────────────
def log_user_created(tenant_id: str, email: str, target_email: str, role: str = "", ip_address: str = ""):
    """ユーザー作成を記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.USER,
        action=Action.CREATE,
        target_type="user",
        target_name=target_email,
        detail={"role": role} if role else None,
        ip_address=ip_address,
    )


def log_user_updated(tenant_id: str, email: str, target_email: str, changes: dict = None, ip_address: str = ""):
    """ユーザー更新を記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.USER,
        action=Action.UPDATE,
        target_type="user",
        target_name=target_email,
        detail=changes,
        ip_address=ip_address,
    )


def log_user_deleted(tenant_id: str, email: str, target_email: str, ip_address: str = ""):
    """ユーザー削除を記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.USER,
        action=Action.DELETE,
        target_type="user",
        target_name=target_email,
        ip_address=ip_address,
    )


def log_password_reset(tenant_id: str, email: str, target_email: str, ip_address: str = ""):
    """パスワードリセットを記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.USER,
        action=Action.EXECUTE,
        target_type="user",
        target_name=target_email,
        ip_address=ip_address,
    )


def log_vq_executed(tenant_id: str, email: str, job_id: str, detail: dict = None, ip_address: str = ""):
    """VQ実行を記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.VQ,
        action=Action.EXECUTE,
        target_type="vq_job",
        target_id=job_id,
        detail=detail,
        ip_address=ip_address,
    )


def log_config_updated(tenant_id: str, email: str, config_type: str, detail: dict = None, ip_address: str = ""):
    """設定変更を記録（prompt / security）"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.CONFIG,
        action=Action.UPDATE,
        target_type=config_type,
        target_name=f"{config_type}設定",
        detail=detail,
        ip_address=ip_address,
    )


def log_data_exported(tenant_id: str, email: str, data_type: str, ip_address: str = ""):
    """データエクスポートを記録"""
    return log_operation(
        tenant_id=tenant_id,
        email=email,
        category=Category.DATA,
        action=Action.VIEW,
        target_type=data_type,
        target_name=data_type,
        ip_address=ip_address,
    )