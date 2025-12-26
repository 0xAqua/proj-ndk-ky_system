# ─────────────────────────────
# Operation History Table (操作履歴)
# ─────────────────────────────
resource "aws_dynamodb_table" "operation_history" {
  name         = "${local.name_prefix}-operation-history"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  hash_key  = "tenant_id"
  range_key = "timestamp_id"


  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "timestamp_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # ─────────────────────────────
  # GSI: カテゴリ × 時刻で絞り込み
  # ─────────────────────────────
  global_secondary_index {
    name            = "CategoryIndex"
    hash_key        = "tenant_id"
    range_key       = "category"
    projection_type = "ALL"
  }

  # ─────────────────────────────
  # GSI: ユーザー（メール）で絞り込み
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
    Project      = var.project
    Environment  = var.environment
    Module       = "data-dynamodb"
    Table        = "operation_history"
    BackupTarget = "True"
  }
}