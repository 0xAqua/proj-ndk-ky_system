# ─────────────────────────────
# Lambda環境変数暗号化用 KMSキー
# ─────────────────────────────

resource "aws_kms_key" "lambda" {
  description             = "${var.name_prefix}-lambda-env-key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name    = "${var.name_prefix}-lambda-key"
    Purpose = "Lambda environment encryption"
  }
}

resource "aws_kms_alias" "lambda" {
  name          = "alias/${var.name_prefix}-lambda"
  target_key_id = aws_kms_key.lambda.key_id
}
