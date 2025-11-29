resource "aws_dynamodb_table" "tenant_construction_master" {
  name         = "${local.name_prefix}-tenant-construction-master"
  billing_mode = "PAY_PER_REQUEST"

  # PK: テナントID, SK: 階層パス (nodePath)
  hash_key  = "tenant_id"
  range_key = "nodePath"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "nodePath"
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
    Table       = "tenant_construction_master"
  }
}