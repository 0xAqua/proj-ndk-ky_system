data "aws_caller_identity" "current" {}

# ─────────────────────────────
# IAM Role (Log Archiver)
# ─────────────────────────────
resource "aws_iam_role" "archiver_role" {
  name = "${var.name_prefix}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.archiver_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 独自の強力なポリシー (Logs Query & DynamoDB Write)
data "aws_iam_policy_document" "archiver_policy" {
  # 1. CloudWatch Logs Insights を実行する権限
  statement {
    effect = "Allow"
    actions = [
      "logs:StartQuery",
      "logs:GetQueryResults",
      "logs:StopQuery",
      "logs:DescribeLogGroups"
    ]
    resources = ["*"] # Insights APIはワイルドカード指定が一般的
  }

  # 2. 保存先 DynamoDB への書き込み
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:BatchWriteItem"
    ]
    resources = [var.log_archive_table_arn]
  }
}

resource "aws_iam_role_policy" "archiver_policy" {
  role   = aws_iam_role.archiver_role.id
  policy = data.aws_iam_policy_document.archiver_policy.json
}

# ─────────────────────────────
# Lambda Function
# ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda_payload.zip"
}

resource "aws_lambda_function" "this" {
  function_name = var.name_prefix
  role          = aws_iam_role.archiver_role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 300 # ログ集計は時間がかかるので長めに (5分)
  memory_size   = 512 # メモリを増やして処理速度UP

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      LOG_ARCHIVE_TABLE = var.log_archive_table_name
      # 収集対象のロググループ名をカンマ区切りで渡す
      TARGET_LOG_GROUPS = join(",", var.target_log_group_names)
    }
  }
}

# ─────────────────────────────
# EventBridge Scheduler (Cron)
# ─────────────────────────────
# 毎日深夜 1:00 (JST) -> UTC 16:00 に実行
resource "aws_cloudwatch_event_rule" "daily_schedule" {
  name                = "${var.name_prefix}-daily-trigger"
  description         = "Trigger log archiver daily"
  schedule_expression = "cron(0 16 * * ? *)" # UTC 16:00 = JST 01:00
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_schedule.name
  target_id = "LogArchiverLambda"
  arn       = aws_lambda_function.this.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_schedule.arn
}