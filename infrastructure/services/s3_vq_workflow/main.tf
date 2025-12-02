# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  producer_src_dir = "${path.module}/lambda/producer"
  worker_src_dir   = "${path.module}/lambda/worker"
}

# ─────────────────────────────
# 共通 IAM Trust Policy
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
# Lambda 依存ライブラリのインストール（producer / worker）
# ─────────────────────────────

# producer 用
resource "null_resource" "producer_deps" {
  triggers = {
    requirements = filesha256("${local.producer_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    working_dir = local.producer_src_dir

    command = <<-EOT
      echo "[s3_vq_workflow/producer] install deps with pip"

      # 念のため過去の依存を掃除
      rm -rf aws_lambda_powertools* boto3* __pycache__

      # 依存ライブラリを producer ディレクトリ直下にインストール
      pip install -r requirements.txt -t .

      echo "[s3_vq_workflow/producer] deps installed"
    EOT
  }
}

# worker 用
resource "null_resource" "worker_deps" {
  triggers = {
    requirements = filesha256("${local.worker_src_dir}/requirements.txt")
  }

  provisioner "local-exec" {
    working_dir = local.worker_src_dir

    command = <<-EOT
      echo "[s3_vq_workflow/worker] install deps with pip"

      # 念のため過去の依存を掃除
      rm -rf aws_lambda_powertools* boto3* __pycache__

      # 依存ライブラリを worker ディレクトリ直下にインストール
      pip install -r requirements.txt -t .

      echo "[s3_vq_workflow/worker] deps installed"
    EOT
  }
}

# ─────────────────────────────
# Lambdaのソースコードをzip化する定義
# ─────────────────────────────

data "archive_file" "producer_zip" {
  type        = "zip"
  source_dir  = local.producer_src_dir
  output_path = "${path.module}/producer_payload.zip"

  excludes = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  # 先に pip 実行してから ZIP させる
  depends_on = [null_resource.producer_deps]
}

data "archive_file" "worker_zip" {
  type        = "zip"
  source_dir  = local.worker_src_dir
  output_path = "${path.module}/worker_payload.zip"

  excludes = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on = [null_resource.worker_deps]
}

# ─────────────────────────────
# 1. IAM Role: Producer (API受付担当)
# ─────────────────────────────
resource "aws_iam_role" "producer_role" {
  name               = "${var.name_prefix}-producer-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# Producerのログ出力権限
resource "aws_iam_role_policy_attachment" "producer_basic" {
  role       = aws_iam_role.producer_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ProducerのX-Ray権限
resource "aws_iam_role_policy_attachment" "producer_xray" {
  role       = aws_iam_role.producer_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

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
# 2. IAM Role: Worker (VQ実行担当)
# ─────────────────────────────
resource "aws_iam_role" "worker_role" {
  name               = "${var.name_prefix}-worker-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# Workerのログ出力権限
resource "aws_iam_role_policy_attachment" "worker_basic" {
  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# WorkerのX-Ray権限
resource "aws_iam_role_policy_attachment" "worker_xray" {
  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

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
    resources = ["${var.vq_secret_arn}*"]
  }
}

resource "aws_iam_role_policy" "worker_policy" {
  role   = aws_iam_role.worker_role.id
  policy = data.aws_iam_policy_document.worker_policy.json
}

# ─────────────────────────────
# 3. Lambda Function: Producer (API受付)
# ─────────────────────────────
resource "aws_lambda_function" "producer" {
  function_name = "${var.name_prefix}-producer"
  role          = aws_iam_role.producer_role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 15

  filename         = data.archive_file.producer_zip.output_path
  source_code_hash = data.archive_file.producer_zip.output_base64sha256

  environment {
    variables = {
      JOB_TABLE_NAME = var.job_table_name
      SQS_QUEUE_URL  = aws_sqs_queue.main.url
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# ─────────────────────────────
# 4. Lambda Function: Worker (VQ実行)
# ─────────────────────────────
resource "aws_lambda_function" "worker" {
  function_name = "${var.name_prefix}-worker"
  role          = aws_iam_role.worker_role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  timeout       = 60

  filename         = data.archive_file.worker_zip.output_path
  source_code_hash = data.archive_file.worker_zip.output_base64sha256

  environment {
    variables = {
      JOB_TABLE_NAME = var.job_table_name
      VQ_SECRET_ARN  = var.vq_secret_arn
    }
  }

  tracing_config {
    mode = "Active"
  }
}

# ─────────────────────────────
# 5. Trigger: SQS -> Worker Lambda
# ─────────────────────────────
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 1
}

# ─────────────────────────────
# 6. API Gateway Integration (Producer)
# ─────────────────────────────
resource "aws_apigatewayv2_integration" "producer" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.producer.invoke_arn
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

# ─────────────────────────────
# 7. CloudWatch Log Groups (明示的な作成)
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "producer_log" {
  name              = "/aws/lambda/${aws_lambda_function.producer.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "worker_log" {
  name              = "/aws/lambda/${aws_lambda_function.worker.function_name}"
  retention_in_days = 30
}


# KMS 復号権限（ポリシードキュメント）
data "aws_iam_policy_document" "kms_decrypt" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

# KMS 復号権限
resource "aws_iam_role_policy" "kms_decrypt_producer" {
  name   = "kms-decrypt-access-producer"
  role   = aws_iam_role.producer_role.id
  policy = data.aws_iam_policy_document.kms_decrypt.json
}

# KMS 復号権限（Worker）※workerがあれば
resource "aws_iam_role_policy" "kms_decrypt_worker" {
  name   = "kms-decrypt-access-worker"
  role   = aws_iam_role.worker_role.id
  policy = data.aws_iam_policy_document.kms_decrypt.json
}