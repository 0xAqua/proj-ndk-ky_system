# ─────────────────────────────
# 0. ローカル変数
# ─────────────────────────────
locals {
  producer_src_dir = "${path.module}/lambda/producer"
  worker_src_dir   = "${path.module}/lambda/worker"
  producer_build_dir = "${path.module}/build/producer"
  worker_build_dir   = "${path.module}/build/worker"
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
# ソースコードのビルド & ZIP化
# ─────────────────────────────

# --- Producer 用ビルド ---
resource "null_resource" "producer_build" {
  triggers = {
    requirements = filesha256("${local.producer_src_dir}/requirements.txt")
    # フォルダ内の全.pyファイルを監視
    code_hash    = sha256(join("", [for f in fileset(local.producer_src_dir, "*.py") : filesha256("${local.producer_src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Building package for Linux (ARM64)..."
      rm -rf ${local.producer_build_dir}
      mkdir -p ${local.producer_build_dir}

      # ★ 修正ポイント: Linux (aarch64) 用のバイナリを強制的に取得するオプションを追加
      pip install -r ${local.producer_src_dir}/requirements.txt \
        -t ${local.producer_build_dir} \
        --platform manylinux2014_aarch64 \
        --implementation cp \
        --python-version 3.12 \
        --only-binary=:all: \
        --upgrade

      # ソースコードをコピー
      cp ${local.producer_src_dir}/*.py ${local.producer_build_dir}/
    EOT
  }

}

data "archive_file" "producer_zip" {
  type        = "zip"
  source_dir  = local.producer_build_dir
  output_path = "${path.module}/producer_payload.zip"
  excludes = [
    "__pycache__",
    ".venv",
    "*.dist-info",
    "**/.DS_Store",
    ".gitkeep",
    "boto3/**",
    "botocore/**",
    "s3transfer/**",
    "bin/**"
  ]
  depends_on  = [null_resource.producer_build]
}

# --- Worker 用ビルド ---
resource "null_resource" "worker_build" {
  triggers = {
    requirements = filesha256("${local.worker_src_dir}/requirements.txt")
    # フォルダ内の全.pyファイルを監視 (元コードのコピペミスを修正: producer -> worker)
    code_hash    = sha256(join("", [for f in fileset(local.worker_src_dir, "*.py") : filesha256("${local.worker_src_dir}/${f}")]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Building package for Linux (ARM64)..."
      rm -rf ${local.worker_build_dir}
      mkdir -p ${local.worker_build_dir}

      # ★ 修正ポイント: Linux (aarch64) 用のバイナリを強制的に取得するオプションを追加
      pip install -r ${local.worker_src_dir}/requirements.txt \
        -t ${local.worker_build_dir} \
        --platform manylinux2014_aarch64 \
        --implementation cp \
        --python-version 3.12 \
        --only-binary=:all: \
        --upgrade

      # ソースコードをコピー
      cp ${local.worker_src_dir}/*.py ${local.worker_build_dir}/
    EOT
  }
}

data "archive_file" "worker_zip" {
  type        = "zip"
  source_dir  = local.worker_build_dir
  output_path = "${path.module}/worker_payload.zip"
  excludes    = ["__pycache__", ".venv", "*.dist-info", "**/.DS_Store", ".gitkeep"]

  depends_on  = [null_resource.worker_build]
}

# ─────────────────────────────
# 1. IAM Role: Producer (API受付担当)
# ─────────────────────────────
resource "aws_iam_role" "producer_role" {
  name               = "${var.name_prefix}-producer-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "producer_basic" {
  role       = aws_iam_role.producer_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "producer_xray" {
  role       = aws_iam_role.producer_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

data "aws_iam_policy_document" "producer_policy" {
  statement { # DynamoDB Put/Get
    effect    = "Allow"
    actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"]
    resources = [var.job_table_arn, var.session_table_arn, var.tenant_config_table_arn]  # ← 追加
  }
  statement { # SQS Send
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.main.arn]
  }
  statement { # Secrets Manager Read (★追加: ProducerもAPIキー取得に必要)
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [
      "${var.vq_secret_arn}*"
    ]
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

resource "aws_iam_role_policy_attachment" "worker_basic" {
  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "worker_xray" {
  role       = aws_iam_role.worker_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

data "aws_iam_policy_document" "worker_policy" {
  statement { # DynamoDB Read/Update
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
    resources = [var.job_table_arn, var.session_table_arn]
  }
  statement { # SQS Receive/Delete/Send (★Sendは再試行ロジックで必要)
    effect    = "Allow"
    actions   = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:SendMessage"
    ]
    resources = [aws_sqs_queue.main.arn]
  }
  statement { # Secrets Manager Read
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [
      "${var.vq_secret_arn}*"
    ]
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
  function_name    = "${var.name_prefix}-producer"
  role             = aws_iam_role.producer_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.12"
  timeout          = 15
  architectures    = ["arm64"]

  filename         = data.archive_file.producer_zip.output_path
  source_code_hash = data.archive_file.producer_zip.output_base64sha256
  kms_key_arn = var.lambda_kms_key_arn

  environment {
    variables = {
      JOB_TABLE_NAME   = var.job_table_name
      SQS_QUEUE_URL    = aws_sqs_queue.main.url
      VQ_SECRET_ARN    = var.vq_secret_arn
      POLLING_INTERVAL = "3"
      AUTH_API_URL     = "${var.external_api_base_url}/public-api/v1/auth"
      MESSAGE_API_URL  = "${var.external_api_base_url}/public-api/v1/message"
      CALLBACK_URL     = "${var.api_endpoint}/webhook"
      SESSION_TABLE    = var.session_table_name
      COOKIE_SAME_SITE  = "Lax"
      ORIGIN_VERIFY_SECRET          = var.origin_verify_secret
      TENANT_CONFIG_TABLE    = var.tenant_config_table_name
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
  function_name    = "${var.name_prefix}-worker"
  role             = aws_iam_role.worker_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.12"
  timeout          = 60
  architectures    = ["arm64"]

  filename         = data.archive_file.worker_zip.output_path
  source_code_hash = data.archive_file.worker_zip.output_base64sha256
  kms_key_arn = var.lambda_kms_key_arn

  reserved_concurrent_executions = 10

  environment {
    variables = {
      JOB_TABLE_NAME   = var.job_table_name
      SQS_QUEUE_URL    = aws_sqs_queue.main.url # ★追加: 再送ロジックで使用
      VQ_SECRET_ARN    = var.vq_secret_arn

      # Pythonコードで使用するAPI URL類 (★追加)
      AUTH_API_URL     = "${var.external_api_base_url}/public-api/v1/auth"
      MESSAGE_API_URL  = "${var.external_api_base_url}/public-api/v1/message"
      CALLBACK_URL     = "${var.api_endpoint}/webhook"

      # ★追加: ポーリング間隔をここで管理する
      POLLING_INTERVAL = "10"
      AUTH_API_URL     = "${var.external_api_base_url}/public-api/v1/auth"
      SESSION_TABLE    = var.session_table_name
      COOKIE_SAME_SITE  = "Lax"
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

# Route: POST /jobs
resource "aws_apigatewayv2_route" "post_job" {
  api_id             = var.api_gateway_id
  route_key          = "POST /jobs"
  target             = "integrations/${aws_apigatewayv2_integration.producer.id}"

  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
}

# Route: GET /jobs/{jobId}
resource "aws_apigatewayv2_route" "get_job" {
  api_id             = var.api_gateway_id
  route_key          = "GET /jobs/{jobId}"
  target             = "integrations/${aws_apigatewayv2_integration.producer.id}"

  authorization_type = "CUSTOM"
  authorizer_id      = var.origin_verify_authorizer_id
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
# 7. CloudWatch Log Groups
# ─────────────────────────────
resource "aws_cloudwatch_log_group" "producer_log" {
  name              = "/aws/lambda/${aws_lambda_function.producer.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "worker_log" {
  name              = "/aws/lambda/${aws_lambda_function.worker.function_name}"
  retention_in_days = 30
}

# ─────────────────────────────
# 8. KMS Decrypt Policy
# ─────────────────────────────
data "aws_iam_policy_document" "kms_decrypt" {
  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.lambda_kms_key_arn]
  }
}

resource "aws_iam_role_policy" "kms_decrypt_producer" {
  name   = "kms-decrypt-access-producer"
  role   = aws_iam_role.producer_role.id
  policy = data.aws_iam_policy_document.kms_decrypt.json
}

resource "aws_iam_role_policy" "kms_decrypt_worker" {
  name   = "kms-decrypt-access-worker"
  role   = aws_iam_role.worker_role.id
  policy = data.aws_iam_policy_document.kms_decrypt.json
}