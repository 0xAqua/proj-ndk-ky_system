# ─────────────────────────────
# 0. ローカル変数 & ビルド設定
# ─────────────────────────────
locals {
  src_dir   = "${path.module}/lambda"
  build_dir = "${path.module}/build/logs"
}

# ─────────────────────────────
# ソースコードのビルド & ZIP化
# ─────────────────────────────
resource "null_resource" "build_lambda" {
  triggers = {
    requirements = filesha256("${local.src_dir}/requirements.txt")
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

    cp -r ${local.src_dir}/*.py ${local.build_dir}/
    cp -r ${local.src_dir}/modules ${local.build_dir}/ 2>/dev/null || true
    cp -r ${local.src_dir}/utils ${local.build_dir}/ 2>/dev/null || true
  EOT
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/lambda_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.build_lambda]
}

resource "aws_lambda_function" "logs" {
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
      TENANT_VQ_MANAGER_TABLE  = var.tenant_vq_manager_table_name
      TENANT_USER_MASTER_TABLE = var.tenant_user_master_table_name
      TENANT_LOG_ARCHIVE_TABLE = var.tenant_log_archive_table_name
      ACCESS_HISTORY_TABLE     = var.access_history_table_name
      OPERATION_HISTORY_TABLE  = var.operation_history_table_name  # ★ 追加
      USER_POOL_ID             = var.user_pool_id
      LOG_LEVEL                = "INFO"
      SESSION_TABLE            = var.session_table_name
      POWERTOOLS_SERVICE_NAME  = "LogsService"
      COOKIE_SAME_SITE         = "Lax"
      ORIGIN_VERIFY_SECRET     = var.origin_verify_secret
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
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:BatchGetItem",
          "dynamodb:PutItem"  # ★ 追加（アクセス履歴の書き込み用）
        ]
        Resource = [
          var.tenant_vq_manager_table_arn,
          "${var.tenant_vq_manager_table_arn}/index/*",
          var.tenant_user_master_table_arn,
          "${var.tenant_user_master_table_arn}/index/*",
          var.tenant_log_archive_table_arn,
          "${var.tenant_log_archive_table_arn}/index/*",
          var.session_table_arn,
          var.access_history_table_arn,
          "${var.access_history_table_arn}/index/*",
          var.operation_history_table_arn,              # ★ 追加
          "${var.operation_history_table_arn}/index/*"  # ★ 追加
        ]
      }
    ]
  })
}

# ★ Cognito Policy（追加）
resource "aws_iam_role_policy" "cognito_policy" {
  name = "${var.name_prefix}-cognito"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser"
        ]
        Resource = var.user_pool_arn
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

# GET /logs/execution
resource "aws_apigatewayv2_route" "execution_logs" {
  api_id             = var.api_gateway_id
  route_key          = "GET /logs/execution"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# ★ GET /logs/access（追加）
resource "aws_apigatewayv2_route" "access_logs" {
  api_id             = var.api_gateway_id
  route_key          = "GET /logs/access"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.logs.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Lambda Permission (API Gateway)
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.logs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# ★ GET /logs/operation（追加）
resource "aws_apigatewayv2_route" "operation_logs" {
  api_id             = var.api_gateway_id
  route_key          = "GET /logs/operation"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# ─────────────────────────────
# ★ CloudWatch Logs Subscription Filter（追加）
# ─────────────────────────────
resource "aws_lambda_permission" "cloudwatch_logs" {
  statement_id  = "AllowCloudWatchLogs"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.logs.function_name
  principal     = "logs.ap-northeast-1.amazonaws.com"
  source_arn    = "${var.cognito_log_group_arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "cognito_logs" {
  name            = "${var.name_prefix}-cognito-subscription"
  log_group_name  = var.cognito_log_group_name
  filter_pattern  = "{ $.message.eventType = \"SignIn\" || $.message.eventType = \"SignIn_Failure\" }"
  destination_arn = aws_lambda_function.logs.arn

  depends_on = [aws_lambda_permission.cloudwatch_logs]
}