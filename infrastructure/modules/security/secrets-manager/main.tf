variable "name_prefix" {
  type = string
}

variable "example_tenant_id" {
  description = "Example Tenant ID (e.g., tenant-a) for creating the initial dummy secret."
  type        = string
  default     = "tenant-example"
}

# ─────────────────────────────
# 1. シークレットの「パスプレフィックス」を定義
# ─────────────────────────────
# このリソースはパスの基点となるプレフィックス（コンテナ）を作成します。
# 例: ndk-ky-dev/vq-key/
resource "aws_secretsmanager_secret" "vq_key_prefix" {
  name        = "${var.name_prefix}/vq-key/"
  description = "Base prefix for tenant-specific VQ API Keys."
  recovery_window_in_days = 0
}

# ─────────────────────────────
# 2. 初期値用のダミーシークレットを作成
# ─────────────────────────────
# テストのため、特定のテナントID（例: tenant-example）用に1つだけシークレットを作成します。
resource "aws_secretsmanager_secret" "initial_dummy_key" {
  name = "${var.name_prefix}/vq-key/${var.example_tenant_id}"
  description = "Dummy key for initial deployment and testing."
  recovery_window_in_days = 0
}

# ダミーの値をセット (Apply後にこの値を実際のAPIキーに手動で書き換えます)
resource "aws_secretsmanager_secret_version" "initial_dummy_version" {
  secret_id     = aws_secretsmanager_secret.initial_dummy_key.id
  secret_string = jsonencode({ "api_key": "REPLACE_WITH_REAL_API_KEY" })

  # ★重要: 以降、値が変わってもTerraformは無視する
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─────────────────────────────
# 3. ARNを出力 (IAMポリシーでワイルドカードを使う基点)
# ─────────────────────────────
output "secret_arn_prefix" {
  # プレフィックスのARNを渡し、IAMポリシー側でワイルドカードを適用します
  value = aws_secretsmanager_secret.vq_key_prefix.arn
}