resource "aws_dynamodb_table" "tenant_vq_manager" {
  name         = "${local.name_prefix}-tenant-vq-manager"
  billing_mode = "PAY_PER_REQUEST"

  # ─────────────────────────────
  # Key Schema
  # ─────────────────────────────
  # ★変更: Pythonコードのロジックに合わせて job_id を単独の主キー(PK)にします
  hash_key = "job_id"

  # ─────────────────────────────
  # Attribute Definitions
  # ─────────────────────────────
  attribute {
    name = "job_id"
    type = "S"
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  # ─────────────────────────────
  # Global Secondary Indexes (GSI)
  # ─────────────────────────────
  # ★追加: テナント単位で作成日順に履歴を取得するためのインデックス
  # Use case: "SELECT * FROM jobs WHERE tenant_id = 'A' ORDER BY created_at DESC"
  global_secondary_index {
    name            = "TenantDateIndex"
    hash_key        = "tenant_id"
    range_key       = "created_at"
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
    Table       = "tenant_vq_manager"
  }
}