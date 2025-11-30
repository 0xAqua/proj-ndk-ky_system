data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# 共通 IAM Trust Policy (省略せずに定義)
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
# IAM Role: Producer (API受付担当)
# ─────────────────────────────
resource "aws_iam_role" "producer_role" {
  name               = "${var.name_prefix}-producer-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "producer_basic" { /* BasicExecutionRole */ }
resource "aws_iam_role_policy_attachment" "producer_xray" { /* XRayDaemonWriteAccess */ }

data "aws_iam_policy_document" "producer_policy" {
  statement { # DynamoDB Put
    effect    = "Allow"
    actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [var.job_table_arn]
  }
  statement { # SQS Send
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.main.arn]
  }
}
resource "aws_iam_role_policy" "producer_policy" {
  role   = aws_iam_role.producer_role.id
  policy = data.aws_iam_policy_document.producer_policy.json
}

# ─────────────────────────────
# IAM Role: Worker (VQ実行担当)
# ─────────────────────────────
resource "aws_iam_role" "worker_role" {
  name               = "${var.name_prefix}-worker-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}
resource "aws_iam_role_policy_attachment" "worker_basic" { /* BasicExecutionRole */ }
resource "aws_iam_role_policy_attachment" "worker_xray" { /* XRayDaemonWriteAccess */ }

data "aws_iam_policy_document" "worker_policy" {
  statement { # DynamoDB Read/Update
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
    resources = [var.job_table_arn]
  }
  statement { # SQS Receive/Delete
    effect    = "Allow"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.main.arn]
  }
  statement { # Secrets Manager Read (API Key)
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.vq_secret_arn] # 特定のシークレットのみ許可
  }
}
resource "aws_iam_role_policy" "worker_policy" {
  role   = aws_iam_role.worker_role.id
  policy = data.aws_iam_policy_document.worker_policy.json
}

# ─────────────────────────────
# Lambda Function: Producer (API受付)
# ─────────────────────────────
resource "aws_lambda_function" "producer" {
  function_name = "${var.name_prefix}-producer"
  role          = aws_iam_role.producer_role.arn
  handler       = "producer/main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 15 # 高速にレスポンスを返すので短くてOK
  # ... (archive_file/source_code_hash は省略)

  environment {
    variables = {
      JOB_TABLE_NAME = var.job_table_name
      SQS_QUEUE_URL  = aws_sqs_queue.main.url
    }
  }
}

# ─────────────────────────────
# Lambda Function: Worker (VQ実行)
# ─────────────────────────────
resource "aws_lambda_function" "worker" {
  function_name = "${var.name_prefix}-worker"
  role          = aws_iam_role.worker_role.arn
  handler       = "worker/main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60 # VQが遅いので長めに設定 (最大15分まで設定可能)

  environment {
    variables = {
      JOB_TABLE_NAME  = var.job_table_name
      VQ_SECRET_ARN   = var.vq_secret_arn
    }
  }
}

# ─────────────────────────────
# Trigger: SQS -> Worker Lambda
# ─────────────────────────────
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 1 # 1件ずつ処理
}

# ─────────────────────────────
# API Gateway Integration (Producer)
# ─────────────────────────────
resource "aws_apigatewayv2_integration" "producer" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"
  connection_type      = "INTERNET"
  integration_method   = "POST"
  integration_uri      = aws_lambda_function.producer.invoke_arn
  payload_format_version = "2.0"
}

# Route定義: POST /jobs
resource "aws_apigatewayv2_route" "post_job" {
  api_id    = var.api_gateway_id
  route_key = "POST /jobs"
  target    = "integrations/${aws_apigatewayv2_integration.producer.id}"

  authorization_type = "JWT"
  authorizer_id      = var.authorizer_id
}

# AGWからProducer起動権限
resource "aws_lambda_permission" "apigw_producer" {
  statement_id  = "AllowExecutionFromAPIGatewayProducer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.producer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}