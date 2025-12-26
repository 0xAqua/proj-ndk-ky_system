# ─────────────────────────────
# BFF認証API (HttpOnly Cookie管理)
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
    # requirements.txt か .py ファイルに変更があった時だけ再実行
    requirements_hash = filesha256("${local.lambda_src_dir}/requirements.txt")
    code_hash         = sha256(join("", [for f in fileset(local.lambda_src_dir, "*.py") : filesha256("${local.lambda_src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    # Linux (ARM64) 用のライブラリを build ディレクトリに集約し、ソースコードもそこにコピーする
    command = <<-EOT
      echo "Building package for Linux (ARM64)..."
      rm -rf ${local.build_dir}
      mkdir -p ${local.build_dir}

      # ライブラリのインストール
      pip install -r ${local.lambda_src_dir}/requirements.txt \
        -t ${local.build_dir} \
        --platform manylinux2014_aarch64 \
        --implementation cp \
        --python-version 3.12 \
        --only-binary=:all: \
        --upgrade

      # ソースコードのコピー
      cp ${local.lambda_src_dir}/*.py ${local.build_dir}/
    EOT
  }
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

# 2. Cognito権限
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
        "cognito-idp:GetUser",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:AssociateWebAuthnCredential",
        "cognito-idp:VerifyWebAuthnCredential",
        "cognito-idp:UpdateUserAttributes"
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
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
        Resource = [var.auth_sessions_table_arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = [var.tenant_user_master_table_arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:GetItem"]
        Resource = [var.tenant_config_table_arn]
      },
      {
        Effect = "Allow"
        Action = ["dynamodb:PutItem"]
        Resource = [var.access_history_table_arn]
      }
    ]
  })
}

# 4. KMS権限
resource "aws_iam_role_policy" "kms" {
  name = "kms-decrypt-access"
  role = aws_iam_role.bff_auth.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["kms:Encrypt", "kms:Decrypt"]
      Resource = [var.lambda_kms_key_arn]
    }]
  })
}

# 5. Lambdaパッケージング (修正済み)
data "archive_file" "lambda_zip" {
  type        = "zip"
  # ↓↓↓ ここが最重要修正ポイントです（buildディレクトリを指定する） ↓↓↓
  source_dir  = local.build_dir
  output_path = "${path.module}/bff_auth_payload.zip"
  excludes    = ["__pycache__", "*.dist-info", "**/.DS_Store"]

  # ビルドが終わってからZipを作成する
  depends_on = [null_resource.build_lambda_package]
}

# 6. Lambda Function
resource "aws_lambda_function" "bff_auth" {
  function_name = var.name_prefix
  role          = aws_iam_role.bff_auth.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      KMS_KEY_ID               = var.kms_key_id
      USER_POOL_ID             = var.user_pool_id
      CLIENT_ID                = var.user_pool_client_id
      SESSION_TABLE            = var.auth_sessions_table_name
      TENANT_USER_MASTER_TABLE = var.tenant_user_master_table_name
      ACCESS_HISTORY_TABLE     = var.access_history_table_name
      ALLOWED_ORIGINS          = join(",", var.allowed_origins)
      POWERTOOLS_SERVICE_NAME  = "BFFAuth"
      POWERTOOLS_LOG_LEVEL     = "INFO"
      COOKIE_SAME_SITE         = "Lax"
      SESSION_TTL_SECONDS      = "3600"
      TENANT_CONFIG_TABLE      = var.tenant_config_table_name
      PENDING_AUTH_TTL_SECONDS = "300"
    }
  }
}

# 7. CloudWatch Logs
resource "aws_cloudwatch_log_group" "bff_auth" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

# 8. API Gateway v2 統合 & 権限
resource "aws_apigatewayv2_integration" "bff_auth" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.bff_auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each  = toset([
    "POST /bff/auth/login",
    "POST /bff/auth/logout",
    "GET /bff/auth/session",
    "POST /bff/auth/refresh",
    "POST /bff/auth/verify-otp",
    "POST /bff/auth/resend-otp",
    "POST /bff/auth/passkey/options",
    "POST /bff/auth/passkey/verify",
    "POST /bff/auth/passkey/register-options",
    "POST /bff/auth/passkey/register-verify",
    "POST /bff/auth/passkey/login",
    "POST /bff/auth/forgot-password",
    "POST /bff/auth/reset-password"
  ])

  api_id    = var.api_gateway_id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.bff_auth.id}"

  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bff_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}