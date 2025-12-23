resource "aws_dynamodb_table" "access_history" {
  name         = "${local.name_prefix}-access-history"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  hash_key  = "timestamp"
  range_key = "email"  # ← 変更

  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "email"  # ← 変更
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
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Module      = "data-dynamodb"
    Table       = "access_history"
  }
}

# ─────────────────────────────
# 保存する属性（参考用コメント）
# ─────────────────────────────
# timestamp   : N  - いつ（UNIXミリ秒）※PK
# email       : S  - 誰が ※SK
# tenant_id   : S  - テナントID
# action      : S  - LOGIN / LOGOUT / TOKEN_REFRESH / LOGIN_FAILED
# source_ip   : S  - どこから
# user_agent  : S  - 何で（ブラウザ/モバイル）
# result      : S  - SUCCESS / FAILED
# expires_at  : N  - TTL（90日後）