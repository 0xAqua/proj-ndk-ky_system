# ─────────────────────────────
# Email OTP カスタム認証チャレンジ
# 3つのLambda: Define / Create / Verify
# ─────────────────────────────

locals {
  lambda_src_dir = "${path.module}/lambda"
  # ビルド用の一時ディレクトリ（ここが散らかってもOKな場所）
  build_dir      = "${path.module}/build/auth_challenge"
}

# ─────────────────────────────
# 共通ビルドプロセス (散らかり防止 & Layer廃止)
# ─────────────────────────────
resource "null_resource" "build_lambda_package" {
  triggers = {
    # requirements.txt か .py ファイルに変更があった時だけ再実行
    requirements_hash = filesha256("${local.lambda_src_dir}/requirements.txt")
    code_hash         = sha256(join("", [for f in fileset(local.lambda_src_dir, "*.py") : filesha256("${local.lambda_src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    # 修正後: Linux (ARM64) 用のライブラリを強制的にインストールします
    command = <<-EOT
      echo "Building package for Linux (ARM64)..."
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

# ビルドディレクトリの中身をまとめてZip化
data "archive_file" "lambda_artifact" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = "${path.module}/auth_challenge_payload.zip"

  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.build_lambda_package]
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

resource "aws_lambda_function" "define_auth" {
  function_name = "${var.name_prefix}-define-auth"
  role          = aws_iam_role.define_auth.arn
  handler       = "define_auth.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  # ★ 共通Zipファイルを使用
  filename         = data.archive_file.lambda_artifact.output_path
  source_code_hash = data.archive_file.lambda_artifact.output_base64sha256

  # Layersは削除 (requirements.txtに含まれるため)

  environment {
    variables = {
      POWERTOOLS_SERVICE_NAME = "DefineAuthChallenge"
      LOG_LEVEL               = "INFO"
      MAX_OTP_ATTEMPTS        = "5"
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

resource "aws_iam_role_policy_attachment" "create_challenge_ses" {
  role       = aws_iam_role.create_challenge.name
  policy_arn = var.ses_send_policy_arn
}

data "aws_iam_policy_document" "create_challenge_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem"
    ]
    resources = [var.otp_table_arn]
  }
}

resource "aws_iam_role_policy" "create_challenge_dynamodb" {
  name   = "dynamodb-write-access"
  role   = aws_iam_role.create_challenge.id
  policy = data.aws_iam_policy_document.create_challenge_dynamodb.json
}

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

# ★ 以前あった個別ビルドの null_resource と archive_file は削除しました ★

resource "aws_lambda_function" "create_challenge" {
  function_name = "${var.name_prefix}-create-challenge"
  role          = aws_iam_role.create_challenge.arn
  handler       = "create_challenge.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 256

  # ★ 共通Zipファイルを使用
  filename         = data.archive_file.lambda_artifact.output_path
  source_code_hash = data.archive_file.lambda_artifact.output_base64sha256

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

# ★ 個別の archive_file は削除しました ★

resource "aws_lambda_function" "verify_challenge" {
  function_name = "${var.name_prefix}-verify-challenge"
  role          = aws_iam_role.verify_challenge.arn
  handler       = "verify_challenge.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  # ★ 共通Zipファイルを使用
  filename         = data.archive_file.lambda_artifact.output_path
  source_code_hash = data.archive_file.lambda_artifact.output_base64sha256

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