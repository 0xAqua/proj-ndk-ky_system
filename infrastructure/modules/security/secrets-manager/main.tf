variable "name_prefix" {
  type = string
}

variable "example_tenant_id" {
  description = "Example Tenant ID (e.g., tenant-a) used in the dummy json."
  type        = string
  default     = "tenant-example"
}

# ─────────────────────────────
# VQ連携用の一元管理シークレット
# ─────────────────────────────
resource "aws_secretsmanager_secret" "vq_credentials" {
  name        = "${var.name_prefix}/vq-credentials"
  description = "Stores VQ API Keys for all tenants as a JSON list."

  # ★修正: 開発中は「即時削除」できるように0日に設定推奨
  recovery_window_in_days = 0
}

# ─────────────────────────────
# 初期値（ダミーJSON）の投入
# ─────────────────────────────
resource "aws_secretsmanager_secret_version" "initial_version" {
  secret_id     = aws_secretsmanager_secret.vq_credentials.id

  secret_string = jsonencode([
    {
      "tenant_id": var.example_tenant_id,
      "secret_data": {
        "api_key": "REPLACE_WITH_REAL_API_KEY",
        "login_id": "REPLACE_WITH_REAL_LOGIN_ID",
        "model_id": "REPLACE_WITH_REAL_MODEL_ID"
      }
    }
  ])

  lifecycle {
    ignore_changes = [secret_string]
  }
}

output "vq_secret_arn" {
  description = "The ARN of the VQ credentials secret"
  value       = aws_secretsmanager_secret.vq_credentials.arn
}