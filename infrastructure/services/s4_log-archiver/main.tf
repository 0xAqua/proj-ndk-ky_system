# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  lambda_src_dir = "${path.module}/lambda"
}

# ─────────────────────────────
# 1. IAM Role & Lambda Function
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

resource "aws_iam_role" "this" {
  name               = "${var.name_prefix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# 基本ポリシー (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ログ収集に必要な権限 (CloudWatch Logs からの読み取り)
data "aws_iam_policy_document" "log_access" {
  statement {
    effect = "Allow"
    actions = [
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:GetLogEvents",
      "logs:FilterLogEvents"
    ]
    resources = ["*"] # 特定のロググループに絞る場合は var.target_log_group_arns を使用
  }
}

resource "aws_iam_role_policy" "log_access" {
  name   = "cloudwatch-logs-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.log_access.json
}

# DynamoDB への書き込み（アーカイブ）およびセッション確認権限
data "aws_iam_policy_document" "dynamodb_access" {
  # アーカイブ先テーブルへの権限
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:BatchWriteItem"
    ]
    resources = [var.log_archive_table_arn]
  }

  # ★ 追加: セッション管理テーブルへの読み取り権限
  # プログラム内で get_session() 等を呼ぶ場合に必須です
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem"
    ]
    resources = [var.session_table_arn]
  }
}

resource "aws_iam_role_policy" "dynamodb_access" {
  name   = "dynamodb-archive-access"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.dynamodb_access.json
}



data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_src_dir
  output_path = "${path.module}/lambda_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

}

resource "aws_lambda_function" "this" {
  function_name = var.name_prefix
  role          = aws_iam_role.this.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 60
  memory_size   = 256

  kms_key_arn = var.lambda_kms_key_arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  layers = [
    "arn:aws:lambda:ap-northeast-1:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-arm64:7"
  ]

  environment {
    variables = {
      LOG_ARCHIVE_TABLE_NAME = var.log_archive_table_name
      TARGET_LOG_GROUPS      = jsonencode(var.target_log_group_names)
      POWERTOOLS_SERVICE_NAME = "LogArchiver"
      LOG_LEVEL               = "INFO"
      COOKIE_SAME_SITE  = "Lax"
      SESSION_TABLE_NAME     = var.session_table_name
    }
  }
}

# ─────────────────────────────
# 2. CloudWatch Log Group
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name_prefix}"
  retention_in_days = 30
}

# ─────────────────────────────
# 3. KMS Decrypt Policy
# ─────────────────────────────
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