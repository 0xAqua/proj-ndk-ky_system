# ─────────────────────────────────────────────────────────────
# ユーザーマスタテーブル (テナント・ユーザー一元管理)
# ─────────────────────────────────────────────────────────────
resource "aws_dynamodb_table" "tenant_user_master" {
  name         = "${local.name_prefix}-tenant-user-master"
  billing_mode = "PAY_PER_REQUEST"

  # パーティションキー: テナントID (隔離用)
  # ソートキー: メールアドレス (ユーザー識別子)
  hash_key  = "tenant_id"
  range_key = "email"  # ← 変更

  # インデックス（検索軸）に使用する属性のみ定義
  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # -----------------------------------------------------------
  # GSI 1: メールアドレスでのユーザー特定（テナント横断検索用）
  # 用途: 全テナント横断でのメールアドレス重複チェック
  # -----------------------------------------------------------
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  # -----------------------------------------------------------
  # GSI 2: テナント内のステータス別一覧
  # 用途: 「特定テナントの ACTIVE なユーザーだけを表示」など
  # -----------------------------------------------------------
  global_secondary_index {
    name            = "TenantStatusIndex"
    hash_key        = "tenant_id"
    range_key       = "status"
    projection_type = "ALL"
  }

  # -----------------------------------------------------------
  # セキュリティ & 運用設定
  # -----------------------------------------------------------

  # AWSマネージド型KMSによる暗号化
  server_side_encryption {
    enabled = true
  }

  # ポイントインタイムリカバリ (誤削除・データ破損対策)
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Module      = "database"
    Table       = "tenant_user_master"
  }
}