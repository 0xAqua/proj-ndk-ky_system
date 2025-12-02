resource "aws_dynamodb_table" "tenant_log_archive" {
  name         = "${local.name_prefix}-tenant-log-archive"
  billing_mode = "PAY_PER_REQUEST"

  # PK: テナントID, SK: タイムスタンプ
  # これにより「特定テナントの・特定期間のログ」を高速に検索可能
  hash_key  = "tenant_id"
  range_key = "timestamp"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N" # UNIX Timestamp
  }

  # TTL (Time To Live): 90日後に自動削除
  ttl {
    attribute_name = "expires_at"
    enabled        = true
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
    Module = "data-dynamodb"
    Table  = "tenant_log_archive"
  }
}