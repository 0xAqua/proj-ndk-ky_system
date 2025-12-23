# ─────────────────────────────
# Origin Verify Lambda Authorizer
# CloudFront経由のリクエストのみ許可
# ─────────────────────────────

# --- Lambda用 IAM Role ---
data "aws_iam_policy_document" "authorizer_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "authorizer" {
  name               = "${var.name_prefix}-authorizer-role"
  assume_role_policy = data.aws_iam_policy_document.authorizer_assume_role.json
}

resource "aws_iam_role_policy_attachment" "authorizer_basic" {
  role       = aws_iam_role.authorizer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Lambda Function ---
locals {
  authorizer_lambda_src_dir = "${path.module}/lambda"
}

data "archive_file" "authorizer_zip" {
  type        = "zip"
  source_dir  = local.authorizer_lambda_src_dir
  output_path = "${path.module}/authorizer_payload.zip"
  excludes    = ["__pycache__", ".DS_Store"]
}

resource "aws_lambda_function" "authorizer" {
  function_name = "${var.name_prefix}-origin-authorizer"
  role          = aws_iam_role.authorizer.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]
  timeout       = 3
  memory_size   = 128

  filename         = data.archive_file.authorizer_zip.output_path
  source_code_hash = data.archive_file.authorizer_zip.output_base64sha256

  environment {
    variables = {
      ORIGIN_VERIFY_SECRET = var.origin_verify_secret
    }
  }
}

resource "aws_cloudwatch_log_group" "authorizer" {
  name              = "/aws/lambda/${var.name_prefix}-origin-authorizer"
  retention_in_days = 14
}

# --- API Gateway Authorizer ---
resource "aws_apigatewayv2_authorizer" "origin_verify" {
  api_id                            = aws_apigatewayv2_api.this.id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  identity_sources                  = ["$request.header.x-origin-verify"]
  name                              = "origin-verify-authorizer"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  authorizer_result_ttl_in_seconds  = 300  # 5分キャッシュ（同一ヘッダーなら再実行しない）
}

# --- Lambda Permission for API Gateway ---
resource "aws_lambda_permission" "authorizer_apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/authorizers/${aws_apigatewayv2_authorizer.origin_verify.id}"
}
