locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_dynamodb_table" "tenant_user_master" {
  name         = "${local.name_prefix}-tenant-user-master"
  billing_mode = "PAY_PER_REQUEST"

  # マルチテナントにおける「特定テナントの特定ユーザー」を一意に特定するキー
  hash_key  = "tenant_id"
  range_key = "user_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "user_id"
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
    Table       = "tenant_user_master"
  }
}