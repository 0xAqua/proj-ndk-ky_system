# ─────────────────────────────
# Email OTP カスタム認証チャレンジ
# 3つのLambda: Define / Create / Verify
# ─────────────────────────────

locals {
  lambda_src_dir = "${path.module}/lambda"
}

# ─────────────────────────────
# 共通: IAM AssumeRole ポリシー
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
# 1. Define Auth Challenge Lambda
# ─────────────────────────────
resource "aws_iam_role" "define_auth" {
  name               = "${var.name_prefix}-define-auth-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "define_auth_basic" {
  role       = aws_iam_role.define_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "define_auth_zip" {
  type        = "zip"
  source_file = "${local.lambda_src_dir}/define_auth.py"
  output_path = "${path.module}/define_auth_payload.zip"
}

resource "aws_lambda_function" "define_auth" {
  function_name = "${var.name_prefix}-define-auth"
  role          = aws_iam_role.define_auth.arn
  handler       = "define_auth.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  layers = ["arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:59"]

  filename         = data.archive_file.define_auth_zip.output_path
  source_code_hash = data.archive_file.define_auth_zip.output_base64sha256

  environment {
    variables = {
      POWERTOOLS_SERVICE_NAME = "DefineAuthChallenge"
      LOG_LEVEL               = "INFO"
    }
  }
}

resource "aws_lambda_permission" "define_auth_cognito" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.define_auth.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.user_pool_arn
}

resource "aws_cloudwatch_log_group" "define_auth" {
  name              = "/aws/lambda/${var.name_prefix}-define-auth"
  retention_in_days = 30
}

# ─────────────────────────────
# 2. Create Auth Challenge Lambda
# ─────────────────────────────
resource "aws_iam_role" "create_challenge" {
  name               = "${var.name_prefix}-create-challenge-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "create_challenge_basic" {
  role       = aws_iam_role.create_challenge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# SES送信権限
resource "aws_iam_role_policy_attachment" "create_challenge_ses" {
  role       = aws_iam_role.create_challenge.name
  policy_arn = var.ses_send_policy_arn
}

# DynamoDB書き込み権限
data "aws_iam_policy_document" "create_challenge_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
    ]
    resources = [var.otp_table_arn]
  }
}

resource "aws_iam_role_policy" "create_challenge_dynamodb" {
  name   = "dynamodb-write-access"
  role   = aws_iam_role.create_challenge.id
  policy = data.aws_iam_policy_document.create_challenge_dynamodb.json
}

# KMS権限（環境変数暗号化用）
data "aws_iam_policy_document" "create_challenge_kms" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "create_challenge_kms" {
  name   = "kms-decrypt-access"
  role   = aws_iam_role.create_challenge.id
  policy = data.aws_iam_policy_document.create_challenge_kms.json
}

# Lambda依存ライブラリのインストール
resource "null_resource" "create_challenge_deps" {
  triggers = {
    requirements = filesha256("${local.lambda_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    working_dir = local.lambda_src_dir

    command = <<-EOT
      echo "[create_challenge] install deps with pip"
      rm -rf aws_lambda_powertools* __pycache__
      pip install -r requirements.txt -t .
      echo "[create_challenge] deps installed"
    EOT
  }
}

data "archive_file" "create_challenge_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/create_challenge_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.create_challenge_deps]
}

resource "aws_lambda_function" "create_challenge" {
  function_name = "${var.name_prefix}-create-challenge"
  role          = aws_iam_role.create_challenge.arn
  handler       = "create_challenge.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 256

  layers = ["arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:59"]

  filename         = data.archive_file.create_challenge_zip.output_path
  source_code_hash = data.archive_file.create_challenge_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      OTP_TABLE_NAME          = var.otp_table_name
      SENDER_EMAIL            = var.sender_email
      OTP_LENGTH              = "6"
      OTP_EXPIRY_SECONDS      = "300"
      POWERTOOLS_SERVICE_NAME = "CreateAuthChallenge"
      LOG_LEVEL               = "INFO"
    }
  }
}

resource "aws_lambda_permission" "create_challenge_cognito" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_challenge.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.user_pool_arn
}

resource "aws_cloudwatch_log_group" "create_challenge" {
  name              = "/aws/lambda/${var.name_prefix}-create-challenge"
  retention_in_days = 30
}

# ─────────────────────────────
# 3. Verify Auth Challenge Lambda
# ─────────────────────────────
resource "aws_iam_role" "verify_challenge" {
  name               = "${var.name_prefix}-verify-challenge-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "verify_challenge_basic" {
  role       = aws_iam_role.verify_challenge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB読み取り・更新・削除権限
data "aws_iam_policy_document" "verify_challenge_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [var.otp_table_arn]
  }
}

resource "aws_iam_role_policy" "verify_challenge_dynamodb" {
  name   = "dynamodb-access"
  role   = aws_iam_role.verify_challenge.id
  policy = data.aws_iam_policy_document.verify_challenge_dynamodb.json
}

# KMS権限
data "aws_iam_policy_document" "verify_challenge_kms" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "verify_challenge_kms" {
  name   = "kms-decrypt-access"
  role   = aws_iam_role.verify_challenge.id
  policy = data.aws_iam_policy_document.verify_challenge_kms.json
}

data "archive_file" "verify_challenge_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/verify_challenge_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.create_challenge_deps]
}

resource "aws_lambda_function" "verify_challenge" {
  function_name = "${var.name_prefix}-verify-challenge"
  role          = aws_iam_role.verify_challenge.arn
  handler       = "verify_challenge.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  layers = ["arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:59"]

  filename         = data.archive_file.verify_challenge_zip.output_path
  source_code_hash = data.archive_file.verify_challenge_zip.output_base64sha256

  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      OTP_TABLE_NAME          = var.otp_table_name
      MAX_ATTEMPTS            = "3"
      POWERTOOLS_SERVICE_NAME = "VerifyAuthChallenge"
      LOG_LEVEL               = "INFO"
    }
  }
}

resource "aws_lambda_permission" "verify_challenge_cognito" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verify_challenge.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = var.user_pool_arn
}

resource "aws_cloudwatch_log_group" "verify_challenge" {
  name              = "/aws/lambda/${var.name_prefix}-verify-challenge"
  retention_in_days = 30
}
