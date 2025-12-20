# ─────────────────────────────
# BFF認証API (HttpOnly Cookie管理)
# ─────────────────────────────

locals {
  lambda_src_dir = "${path.module}/lambda"
}

# 1. IAM Role & AssumeRole (変更なし)
data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "bff_auth" {
  name               = "${var.name_prefix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.bff_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 2. Cognito権限 (変更なし)
resource "aws_iam_role_policy" "cognito" {
  name = "cognito-access"
  role = aws_iam_role.bff_auth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cognito-idp:InitiateAuth",
        "cognito-idp:RespondToAuthChallenge",
        "cognito-idp:GetUser"
      ]
      Resource = ["*"]
    }]
  })
}

# 3. DynamoDB権限
resource "aws_iam_role_policy" "dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.bff_auth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # セッション管理テーブル (変更なし)
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
        Resource = [var.auth_sessions_table_arn]
      },
      {
        # ★修正: ユーザーマスタテーブル (role取得 + ログイン情報更新用)
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem" # ← これを追加
        ]
        Resource = [var.tenant_user_master_table_arn]
      }
    ]
  })
}

# 4. KMS権限 (変更なし)
resource "aws_iam_role_policy" "kms" {
  name = "kms-decrypt-access"
  role = aws_iam_role.bff_auth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = [
        "kms:Encrypt",
        "kms:Decrypt"
      ]
      Resource = [var.lambda_kms_key_arn]
    }]
  })
}

# 5. Lambdaパッケージング ★他サービスに合わせ null_resource 削除
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/bff_auth_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]
}

# 6. Lambda Function ★環境変数を追加
resource "aws_lambda_function" "bff_auth" {
  function_name = var.name_prefix
  role          = aws_iam_role.bff_auth.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["x86_64"]
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
      KMS_KEY_ID              = var.kms_key_id
      USER_POOL_ID             = var.user_pool_id
      CLIENT_ID                = var.user_pool_client_id
      SESSION_TABLE            = var.auth_sessions_table_name
      # ★ Python側の KeyError 解消のために追加
      TENANT_USER_MASTER_TABLE = var.tenant_user_master_table_name
      ALLOWED_ORIGINS          = join(",", var.allowed_origins)
      POWERTOOLS_SERVICE_NAME  = "BFFAuth"
      POWERTOOLS_LOG_LEVEL     = "INFO"
      COOKIE_SAME_SITE  = "Lax"
    }
  }
}

# 7. CloudWatch Logs
resource "aws_cloudwatch_log_group" "bff_auth" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

# 8. API Gateway v2 統合 & 権限 (変更なし)
resource "aws_apigatewayv2_integration" "bff_auth" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.bff_auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = toset(["POST /bff/auth/login", "POST /bff/auth/logout", "GET /bff/auth/session", "POST /bff/auth/refresh"])
  api_id    = var.api_gateway_id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bff_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}