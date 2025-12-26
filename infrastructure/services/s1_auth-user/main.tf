# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  lambda_src_dir = "${path.module}/lambda"
  build_dir      = "${path.module}/build"
}

# ─────────────────────────────
# ビルドプロセス (散らかり防止版)
# ─────────────────────────────
resource "null_resource" "build_lambda_package" {
  triggers = {
    requirements_hash = filesha256("${local.lambda_src_dir}/requirements.txt")
    code_hash         = sha256(join("", [for f in fileset(local.lambda_src_dir, "*.py") : filesha256("${local.lambda_src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      rm -rf ${local.build_dir}
      mkdir -p ${local.build_dir}

      pip install -r ${local.lambda_src_dir}/requirements.txt \
        -t ${local.build_dir} \
        --platform manylinux2014_aarch64 \
        --implementation cp \
        --python-version 3.12 \
        --only-binary=:all: \
        --upgrade

      cp ${local.lambda_src_dir}/*.py ${local.build_dir}/
    EOT
  }
}

# ─────────────────────────────
# 1. IAM Role & Lambda Function
# ─────────────────────────────

# AssumeRole 設定
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

# 基本ポリシー (Logs + X-Ray)
resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# ★重要: DynamoDB 読み取り権限 (1つに統合)
data "aws_iam_policy_document" "dynamodb_read" {
  # ユーザーマスタ取得用
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [var.tenant_user_master_table_arn]
  }

  # 工事マスタ取得用 (Query必須)
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = [var.construction_master_table_arn]
  }

  # セッション取得用 (GetItem)
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [var.session_table_arn]
  }
}

resource "aws_iam_role_policy" "dynamodb_read" {
  name   = "dynamodb-combined-access" # 名前を重複しないものに
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.dynamodb_read.json
}

# ─────────────────────────────
# Lambda Function 本体
# ─────────────────────────────

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.build_dir

  output_path = "${path.module}/lambda_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.build_lambda_package]
}

resource "aws_lambda_function" "this" {
  function_name = var.name_prefix
  role          = aws_iam_role.this.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256
  reserved_concurrent_executions = 10

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      TENANT_USER_MASTER_TABLE_NAME  = var.tenant_user_master_table_name
      CONSTRUCTION_MASTER_TABLE_NAME = var.construction_master_table_name
      SESSION_TABLE                  = var.session_table_name
      POWERTOOLS_SERVICE_NAME        = "AuthUserContext"
      LOG_LEVEL                      = "INFO"
      COOKIE_SAME_SITE               = "Lax"
      ORIGIN_VERIFY_SECRET           = var.origin_verify_secret
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# ─────────────────────────────
# 2. ルーティング設定
# ─────────────────────────────
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                = var.api_gateway_id
  integration_type      = "AWS_PROXY"
  connection_type       = "INTERNET"
  integration_method    = "POST"
  integration_uri       = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_auth_context" {
  api_id    = var.api_gateway_id
  route_key = "GET /auth-context" # 名前を機能に合わせたものに
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# ─────────────────────────────
# 3. 権限・ログ設定 (KMSなど)
# ─────────────────────────────
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

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