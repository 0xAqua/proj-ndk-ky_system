# ─────────────────────────────
# OTPコード一時保存テーブル
# Email OTP認証で使用する認証コードを保存
# ─────────────────────────────
resource "aws_dynamodb_table" "otp_codes" {
  name         = "${local.name_prefix}-otp-codes"
  billing_mode = "PAY_PER_REQUEST"

  # マルチテナント対応
  # PK: tenant_id（テナント分離）
  # SK: email（ユーザー特定）
  hash_key  = "tenant_id"
  range_key = "email"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # TTL: 期限切れOTPを自動削除（5分後）
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # 暗号化
  server_side_encryption {
    enabled = true
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Module      = "data-dynamodb"
    Table       = "otp_codes"
  }
}
