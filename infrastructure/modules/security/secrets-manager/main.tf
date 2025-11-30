variable "name_prefix" { type = string }

# 1. シークレットの「箱」を作成
resource "aws_secretsmanager_secret" "vq_keys" {
  name        = "${var.name_prefix}/vq-keys"
  description = "API Keys for VQ System (JSON format: { tenant_id: api_key })"

  # 誤削除防止（開発環境なら0日で即削除でもOK）
  recovery_window_in_days = 0
}

# 2. 初期値（ダミー）を入れておく
# これがないと、コンソールで値を入れるまで "SecretValue" が存在しない状態になるため
resource "aws_secretsmanager_secret_version" "initial" {
  secret_id     = aws_secretsmanager_secret.vq_keys.id
  secret_string = jsonencode({
    "tenant-example": "change_me_in_console"
  })

  # 重要: 以降、値が変わってもTerraformは無視する（手動管理するため）
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# 3. ARNを出力（Lambdaの権限設定で使う！）
output "secret_arn" {
  value = aws_secretsmanager_secret.vq_keys.arn
}