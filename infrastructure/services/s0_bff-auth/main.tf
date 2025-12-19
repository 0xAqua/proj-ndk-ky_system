# ─────────────────────────────
# BFF認証API (HttpOnly Cookie管理)
# セッションベース認証のバックエンド層
# ─────────────────────────────

locals {
  lambda_src_dir = "${path.module}/lambda"
}

# ─────────────────────────────
# IAM AssumeRole ポリシー
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

# ─────────────────────────────
# IAM Role
# ─────────────────────────────
resource "aws_iam_role" "bff_auth" {
  name               = "${var.name_prefix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# 基本実行ロール
resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.bff_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ─────────────────────────────
# Cognito権限
# ─────────────────────────────
data "aws_iam_policy_document" "cognito" {
  statement {
    effect = "Allow"
    actions = [
      "cognito-idp:InitiateAuth",
      "cognito-idp:RespondToAuthChallenge",
      "cognito-idp:GetUser",
    ]
    resources = ["*"]  # Cognitoは特定のリソースARNを指定できないため
  }
}

resource "aws_iam_role_policy" "cognito" {
  name   = "cognito-access"
  role   = aws_iam_role.bff_auth.id
  policy = data.aws_iam_policy_document.cognito.json
}

# ─────────────────────────────
# DynamoDB権限 (セッション管理)
# ─────────────────────────────
data "aws_iam_policy_document" "dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [var.auth_sessions_table_arn]
  }
}

resource "aws_iam_role_policy" "dynamodb" {
  name   = "dynamodb-access"
  role   = aws_iam_role.bff_auth.id
  policy = data.aws_iam_policy_document.dynamodb.json
}

# ─────────────────────────────
# KMS権限 (環境変数暗号化用)
# ─────────────────────────────
data "aws_iam_policy_document" "kms" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "kms" {
  name   = "kms-decrypt-access"
  role   = aws_iam_role.bff_auth.id
  policy = data.aws_iam_policy_document.kms.json
}

# ─────────────────────────────
# Lambda依存ライブラリのインストール
# ─────────────────────────────
resource "null_resource" "deps" {
  triggers = {
    requirements = filesha256("${local.lambda_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    working_dir = local.lambda_src_dir

    command = <<-EOT
      echo "[bff-auth] install deps with pip"
      rm -rf boto3* botocore* __pycache__
      pip install -r requirements.txt -t .
      echo "[bff-auth] deps installed"
    EOT
  }
}

# ─────────────────────────────
# Lambda デプロイパッケージ
# ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/bff_auth_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.deps]
}

# ─────────────────────────────
# Lambda Function
# ─────────────────────────────
resource "aws_lambda_function" "bff_auth" {
  function_name = var.name_prefix
  role          = aws_iam_role.bff_auth.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  architectures = ["x86_64"]  # ★layerに合わせてarm64からx86_64に変更
  timeout       = 30
  memory_size   = 256

  layers = [
    "arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:7"
  ]

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      USER_POOL_ID        = var.user_pool_id
      CLIENT_ID           = var.user_pool_client_id
      SESSION_TABLE       = var.auth_sessions_table_name
      ALLOWED_ORIGINS     = join(",", var.allowed_origins)
      LOG_LEVEL           = "INFO"
      # ★Powertools用環境変数追加
      POWERTOOLS_SERVICE_NAME = "BFFAuth"
      POWERTOOLS_LOG_LEVEL    = "INFO"
    }
  }
}

# ─────────────────────────────
# CloudWatch Logs
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "bff_auth" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

# ─────────────────────────────
# API Gateway v2 (HTTP API) 統合
# ─────────────────────────────

# Lambda統合
resource "aws_apigatewayv2_integration" "bff_auth" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"

  connection_type      = "INTERNET"
  description          = "BFF Auth Lambda integration"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.bff_auth.invoke_arn
  payload_format_version = "2.0"
}

# ルート定義
resource "aws_apigatewayv2_route" "login" {
  api_id    = var.api_gateway_id
  route_key = "POST /bff/auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"
}

resource "aws_apigatewayv2_route" "logout" {
  api_id    = var.api_gateway_id
  route_key = "POST /bff/auth/logout"
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"
}

resource "aws_apigatewayv2_route" "session" {
  api_id    = var.api_gateway_id
  route_key = "GET /bff/auth/session"
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"
}

resource "aws_apigatewayv2_route" "refresh" {
  api_id    = var.api_gateway_id
  route_key = "POST /bff/auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"
}

# Lambda呼び出し権限
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bff_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}