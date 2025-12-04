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
# Pythonコードは「1つのシークレットから全テナントの情報を読み取る」ロジックなので、
# 階層構造にはせず、1つのJSONファイルを置くためのシークレットを作成します。

resource "aws_secretsmanager_secret" "vq_credentials" {
  # 名前例: ndk-ky-dev/vq-credentials
  name        = "${var.name_prefix}/vq-credentials"
  description = "Stores VQ API Keys for all tenants as a JSON list."
  recovery_window_in_days = 7
}

# ─────────────────────────────
# 初期値（ダミーJSON）の投入
# ─────────────────────────────
resource "aws_secretsmanager_secret_version" "initial_version" {
  secret_id     = aws_secretsmanager_secret.vq_credentials.id

  # Pythonコードが期待している「配列形式」のJSONを初期値としてセットします
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

  # ★重要: 初回作成後はAWSコンソールで値を書き換えるため、Terraformでの変更は無視する
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─────────────────────────────
# Output (Lambdaに渡すARN)
# ─────────────────────────────
output "vq_secret_arn" {
  description = "The ARN of the VQ credentials secret"
  value       = aws_secretsmanager_secret.vq_credentials.arn
}