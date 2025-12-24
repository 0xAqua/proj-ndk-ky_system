# ─────────────────────────────
# Tenant Config Master
# ─────────────────────────────
resource "aws_dynamodb_table" "tenant_config_master" {
  name         = "${local.name_prefix}-tenant-config-master"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "tenant_id"

  attribute {
    name = "tenant_id"
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
    Table       = "tenant_config_master"
  }
}

# ─────────────────────────────
# 想定する属性構造（参考用コメント）
# ─────────────────────────────
# tenant_id     : S  - テナントID ※PK
# prompt_config : M  - KYプロンプト設定
#   - total_incidents            : N    - 出力するインシデント合計数
#   - fact_incidents             : N    - 過去事例インシデント数
#   - countermeasures_per_case   : N    - 1インシデントあたりの対応策数
#   - include_predicted_incidents: BOOL - AI予測インシデントを含めるか
# created_at    : N  - 作成日時
# updated_at    : N  - 更新日時