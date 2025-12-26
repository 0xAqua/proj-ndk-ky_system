# ─────────────────────────────
# 0. ローカル変数 & ビルド設定
# ─────────────────────────────
locals {
  # ソースコードの場所
  src_dir   = "${path.module}/lambda"
  # ビルド作業用の一時ディレクトリ
  build_dir = "${path.module}/build/tenant_config"
}

# ─────────────────────────────
# ソースコードのビルド & ZIP化
# ─────────────────────────────
resource "null_resource" "build_lambda" {
  triggers = {
    requirements = filesha256("${local.src_dir}/requirements.txt")
    # フォルダ内の全.pyファイルを監視
    code_hash    = sha256(join("", [for f in fileset(local.src_dir, "*.py") : filesha256("${local.src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOT
    echo "Building package for Linux (ARM64)..."
    rm -rf ${local.build_dir}
    mkdir -p ${local.build_dir}

    pip install -r ${local.src_dir}/requirements.txt \
      -t ${local.build_dir} \
      --platform manylinux2014_aarch64 \
      --implementation cp \
      --python-version 3.12 \
      --only-binary=:all: \
      --upgrade

    # ソースコードをコピー（サブディレクトリ含む）
    cp -r ${local.src_dir}/*.py ${local.build_dir}/
    cp -r ${local.src_dir}/modules ${local.build_dir}/ 2>/dev/null || true
    # ★ shared フォルダをコピー
    cp -r ${path.module}/../shared ${local.build_dir}/ 2>/dev/null || true
  EOT
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/lambda_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on  = [null_resource.build_lambda]
}

resource "aws_lambda_function" "tenant_config" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.name_prefix
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  architectures    = ["arm64"]
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      TENANT_CONFIG_TABLE = var.tenant_config_table_name
      OPERATION_HISTORY_TABLE   = var.operation_history_table_name
      LOG_LEVEL           = "INFO"
      SESSION_TABLE       = var.session_table_name
      COOKIE_SAME_SITE    = "Lax"
    }
  }

  kms_key_arn = var.lambda_kms_key_arn

  tags = {
    Name = var.name_prefix
  }
}

# ─────────────────────────────
# IAM Role
# ─────────────────────────────
resource "aws_iam_role" "lambda_role" {
  name = "${var.name_prefix}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Policy
resource "aws_iam_role_policy" "dynamodb_policy" {
  name = "${var.name_prefix}-dynamodb"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          var.tenant_config_table_arn,
          var.operation_history_table_arn  # ★ 追加
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = var.session_table_arn
      }
    ]
  })
}

# KMS Policy
resource "aws_iam_role_policy" "kms_policy" {
  name = "${var.name_prefix}-kms"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.lambda_kms_key_arn
      }
    ]
  })
}

# ─────────────────────────────
# API Gateway Integration
# ─────────────────────────────

# GET /tenant-config/prompt - プロンプト設定取得
resource "aws_apigatewayv2_route" "get_prompt_config" {
  api_id             = var.api_gateway_id
  route_key          = "GET /tenant-config/prompt"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# PUT /tenant-config/prompt - プロンプト設定更新
resource "aws_apigatewayv2_route" "put_prompt_config" {
  api_id             = var.api_gateway_id
  route_key          = "PUT /tenant-config/prompt"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# GET /tenant-config/security - セキュリティ設定取得
resource "aws_apigatewayv2_route" "get_security_config" {
  api_id             = var.api_gateway_id
  route_key          = "GET /tenant-config/security"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# PUT /tenant-config/security - セキュリティ設定更新
resource "aws_apigatewayv2_route" "put_security_config" {
  api_id             = var.api_gateway_id
  route_key          = "PUT /tenant-config/security"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tenant_config.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Lambda Permission
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tenant_config.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# ─────────────────────────────
# CloudWatch Log Group
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "lambda_log" {
  name              = "/aws/lambda/${aws_lambda_function.tenant_config.function_name}"
  retention_in_days = 30
}