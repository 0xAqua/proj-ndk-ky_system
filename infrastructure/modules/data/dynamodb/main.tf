locals {
  # リソース名のプレフィックス: ndk-ky-dev みたいな感じ
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_dynamodb_table" "tenant_user_master" {
  # 例: ndk-ky-dev-tenant-user-master
  name         = "${local.name_prefix}-tenant-user-master"
  billing_mode = "PAY_PER_REQUEST" # 最初はオンデマンド課金でOK

  # ── 主キー構成 ───────────────────────────────
  # 1テナント = 1レコードを想定するので、PKのみ
  hash_key = "tenant_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  # ── ここから下は将来的に必要に応じて拡張 ───
  # departments や user_id, status, created_at, updated_at などは
  # DynamoDB 側ではスキーマレスな属性として自由に持てるので、
  # Terraform上で attribute 定義は不要。
  #
  # 実際に入るイメージ:
  # {
  #   "tenant_id": "tenant-a",
  #   "tenant_name": "テナントA株式会社",
  #   "domain": "tenant-a.example.com",
  #   "departments": {
  #     "COMMON": "共通",
  #     "NETWORK": "ネットワーク",
  #     "MOBILE": "モバイル"
  #   },
  #   "user_id": "3714ca08-...",       // Cognito sub（代表ユーザー）
  #   "status": "ACTIVE",
  #   "created_at": "2025-11-29T00:00:00Z",
  #   "updated_at": "2025-11-29T00:00:00Z"
  # }

  # 必要ならサーバーサイド暗号化やPITRをオンにする
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
