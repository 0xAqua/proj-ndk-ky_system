# ─────────────────────────────
# Lambda Function
# ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda_payload.zip"
}

resource "aws_lambda_function" "vq_jobs" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.name_prefix
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  architectures = ["x86_64"]
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30
  memory_size      = 256

  layers = [
    "arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:7"
  ]

  environment {
    variables = {
      TENANT_VQ_MANAGER_TABLE = var.tenant_vq_manager_table_name
      LOG_LEVEL               = "INFO"
      SESSION_TABLE      = var.session_table_name
      COOKIE_SAME_SITE  = "Lax"

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
        Action = ["dynamodb:Query", "dynamodb:GetItem"]
        Resource = [
          var.tenant_vq_manager_table_arn,
          "${var.tenant_vq_manager_table_arn}/index/*",
          var.session_table_arn # セッションテーブルへの参照
        ]
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

# GET /vq-jobs リソース
resource "aws_apigatewayv2_route" "list_jobs" {
  api_id             = var.api_gateway_id
  route_key          = "GET /vq-jobs"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# GET /vq-jobs/{jobId}/reply リソース
resource "aws_apigatewayv2_route" "vq_job_reply" {
  api_id             = var.api_gateway_id
  route_key          = "GET /vq-jobs/{jobId}/reply"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}


# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vq_jobs.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Lambda Permission
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vq_jobs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
