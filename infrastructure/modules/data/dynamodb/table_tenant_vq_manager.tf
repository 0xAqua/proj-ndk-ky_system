locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_dynamodb_table" "tenant_vq_manager" { # ★リソース名を変更
  name         = "${local.name_prefix}-tenant-vq-manager" # ★テーブル名を変更
  billing_mode = "PAY_PER_REQUEST"

  # PK: テナントID, SK: ジョブID
  hash_key  = "tenant_id"
  range_key = "job_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "job_id"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Module      = "data-dynamodb"
    Table       = "tenant_vq_manager"
  }
}