# ─────────────────────────────
# Lambda Function
# ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda_payload.zip"
}

resource "aws_lambda_function" "admin_user" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.name_prefix
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  timeout          = 30
  memory_size      = 256

  layers = [
    "arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:7"
  ]

  environment {
    variables = {
      USER_POOL_ID              = var.user_pool_id
      TENANT_MASTER_TABLE       = var.tenant_master_table_name
      TENANT_USER_MASTER_TABLE  = var.tenant_user_master_table_name
      LOG_LEVEL                 = "INFO"
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
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          var.tenant_master_table_arn,
          var.tenant_user_master_table_arn,
          "${var.tenant_user_master_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Cognito Admin Policy
resource "aws_iam_role_policy" "cognito_admin_policy" {
  name = "${var.name_prefix}-cognito-admin"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers"
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

# /admin/users リソース
resource "aws_apigatewayv2_route" "list_users" {
  api_id             = var.api_gateway_id
  route_key          = "GET /admin/users"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

resource "aws_apigatewayv2_route" "create_user" {
  api_id             = var.api_gateway_id
  route_key          = "POST /admin/users"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# /admin/users/{user_id} リソース
resource "aws_apigatewayv2_route" "get_user" {
  api_id             = var.api_gateway_id
  route_key          = "GET /admin/users/{user_id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

resource "aws_apigatewayv2_route" "update_user" {
  api_id             = var.api_gateway_id
  route_key          = "PATCH /admin/users/{user_id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

resource "aws_apigatewayv2_route" "delete_user" {
  api_id             = var.api_gateway_id
  route_key          = "DELETE /admin/users/{user_id}"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# Lambda Integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_user.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Lambda Permission
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_user.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}