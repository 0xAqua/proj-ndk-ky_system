# Subscription Filter
# これを導入するかEventBridgeで対応するのか

resource "aws_dynamodb_table" "operation_history" {
  name         = "${local.name_prefix}-operation-history"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  hash_key  = "timestamp"
  range_key = "user_id"

  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "user_id"
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
    Table       = "operation_history"
  }
}

# ─────────────────────────────
# 保存する属性（参考用コメント）
# ─────────────────────────────
# timestamp     : N  - いつ（UNIXミリ秒）※PK
# user_id       : S  - 誰が ※SK
# action        : S  - CREATE / UPDATE / DELETE / VIEW / EXECUTE
# resource_type : S  - user / project / rag / ...
# message       : S  - "ユーザー 山田太郎 を削除しました"
# expires_at    : N  - TTL（90日後）
