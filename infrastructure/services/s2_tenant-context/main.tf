# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  # Lambda のソースコードディレクトリ
  lambda_src_dir = "${path.module}/lambda"
}

# ─────────────────────────────
# 1. IAM Role & Lambda Function
# ─────────────────────────────

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

# 基本ポリシー (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# X-Ray トレース (Powertools用)
resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# ★重要: DynamoDB 読み取り権限 (Query対応)
data "aws_iam_policy_document" "dynamodb_read" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:Query", # begins_with などの検索に必須
      # "dynamodb:BatchGetItem" # 将来必要なら追加
    ]
    resources = [var.construction_master_table_arn]
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
      echo "[s2_tenant-context] install deps with pip"

      # 念のため過去の依存を掃除
      rm -rf aws_lambda_powertools* boto3* __pycache__

      # 依存ライブラリを lambda/ 直下にインストール
      pip install -r requirements.txt -t .

      echo "[s2_tenant-context] deps installed"
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

resource "aws_lambda_function" "this" {
  function_name = var.name_prefix
  role          = aws_iam_role.this.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  kms_key_arn = var.lambda_kms_key_arn


  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      # Pythonコード内の os.environ.get("...") と合わせる
      CONSTRUCTION_MASTER_TABLE_NAME = var.construction_master_table_name
      POWERTOOLS_SERVICE_NAME        = "TenantContext"
      LOG_LEVEL                      = "INFO"
      SESSION_TABLE_NAME            = var.session_table_name
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# ─────────────────────────────
# 2. ルーティング設定 (共通AGWへ追加)
# ─────────────────────────────
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"

  connection_type        = "INTERNET"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_master" {
  api_id    = var.api_gateway_id
  route_key = "GET /construction-master"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "NONE"
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