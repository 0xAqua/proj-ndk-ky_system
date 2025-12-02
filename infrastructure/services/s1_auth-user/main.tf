# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  # Lambda のソースコードディレクトリ（main.py / requirements.txt が置いてある場所）
  lambda_src_dir = "${path.module}/lambda"
}

# ─────────────────────────────
# 1. IAM Role & Lambda Function
# ─────────────────────────────

# Lambda 用 AssumeRole ポリシー
data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name_prefix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# 基本ポリシー + X-Ray
resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# DynamoDB 読み取り権限
data "aws_iam_policy_document" "dynamodb_read" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [var.tenant_user_master_table_arn]
  }
}

resource "aws_iam_role_policy" "dynamodb_read" {
  name   = "dynamodb-read-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.dynamodb_read.json
}

# ─────────────────────────────
# Lambda 依存ライブラリのインストール（ローカルで pip 実行）
# ─────────────────────────────
resource "null_resource" "lambda_deps" {
  # requirements.txt が変わったら再実行
  triggers = {
    requirements = filesha256("${local.lambda_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    working_dir = local.lambda_src_dir

    command = <<-EOT
      echo "[s1_auth-user] install deps with pip"

      # 念のため過去の依存を掃除
      rm -rf aws_lambda_powertools* boto3* __pycache__

      # 依存ライブラリを lambda/ 直下にインストール
      pip install -r requirements.txt -t .

      echo "[s1_auth-user] deps installed"
    EOT
  }
}

# ─────────────────────────────
# Lambda ソースコードのZIP化
# ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/lambda_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  # 先に pip 実行してから ZIP させる
  depends_on = [null_resource.lambda_deps]
}

# ─────────────────────────────
# Lambda Function 本体
# ─────────────────────────────
resource "aws_lambda_function" "this" {
  function_name = var.name_prefix
  role          = aws_iam_role.this.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256
  reserved_concurrent_executions = 100  # 最大同時実行数を制限

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      TENANT_USER_MASTER_TABLE_NAME = var.tenant_user_master_table_name
      POWERTOOLS_SERVICE_NAME       = "AuthUserContext"
      LOG_LEVEL                     = "INFO"
    }
  }

  tracing_config {
    mode = "Active"
  }

  # ★削除: テナント分離モード設定は削除済み
}

# ─────────────────────────────
# 2. ルーティング設定 (共通AGWへ追加)
# ─────────────────────────────
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                = var.api_gateway_id
  integration_type      = "AWS_PROXY"
  connection_type       = "INTERNET"
  integration_method    = "POST"
  integration_uri       = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_me" {
  api_id    = var.api_gateway_id
  route_key = "GET /me" # APIのパス定義
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  # 共通Authorizerを使用
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# ─────────────────────────────
# 3. 権限設定 (AGWからLambda起動許可)
# ─────────────────────────────
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# ─────────────────────────────
# 4. CloudWatch Log Group (ログ管理)
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

# KMS 復号権限
data "aws_iam_policy_document" "kms_decrypt" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "kms_decrypt" {
  name   = "kms-decrypt-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.kms_decrypt.json
}
