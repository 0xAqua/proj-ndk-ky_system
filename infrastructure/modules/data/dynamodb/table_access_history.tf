resource "aws_dynamodb_table" "access_history" {
  name         = "${local.name_prefix}-access-history"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  hash_key  = "tenant_id"           # ← テナント別に分離
  range_key = "timestamp_event_id"  # ← timestamp#eventId で一意性担保

  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "timestamp_event_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # ─────────────────────────────
  # GSI: メールアドレスで検索用
  # ─────────────────────────────
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "tenant_id"
    range_key       = "email"
    projection_type = "ALL"
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
# 保存する属性
# ─────────────────────────────
# tenant_id          : S  - テナントID ※PK
# timestamp_event_id : S  - "1735182411276#9ae213af-..." ※SK
# email              : S  - 誰が
# event_type         : S  - SignIn / SignIn_Failure / TokenRefresh
# result             : S  - Pass / Fail
# ip_address         : S  - どこから
# city               : S  - 都市
# country            : S  - 国
# risk_level         : S  - LOW / MEDIUM / HIGH
# user_sub           : S  - CognitoユーザーID（参照用）
# created_at         : N  - UNIXタイムスタンプ（ソート・表示用）
# expires_at         : N  - TTL（90日後）