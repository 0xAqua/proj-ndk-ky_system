# ─────────────────────────────
# Auth Sessions Table
# BFF認証用のセッション管理テーブル
# ─────────────────────────────
resource "aws_dynamodb_table" "auth_sessions" {
  name         = "${local.name_prefix}-auth-sessions"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  hash_key = "session_id"

  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "session_id"
    type = "S"
  }

  # ─────────────────────────────
  # Settings
  # ─────────────────────────────
  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Module      = "data-dynamodb"
    Table       = "auth_sessions"
  }
}

# ─────────────────────────────
# 保存する属性（参考用コメント）
# ─────────────────────────────
# session_id     : S  - セッションID (ランダム生成) ※PK
# user_id        : S  - ユーザーID (Cognito sub)
# access_token   : S  - Cognitoアクセストークン
# id_token       : S  - Cognito IDトークン
# refresh_token  : S  - Cognitoリフレッシュトークン
# created_at     : N  - 作成日時 (UNIXタイムスタンプ)
# ttl            : N  - 有効期限 (UNIXタイムスタンプ) ※TTL属性
# last_accessed  : N  - 最終アクセス日時 (オプション)