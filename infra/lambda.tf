resource "aws_iam_role" "lambda_exec_role" {
  name = "ndk-ky-dev-lambda-dynamodb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })

  tags = {
    Name        = "ndk-ky-dev-lambda-dynamodb-role"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "ndk-ky-dev-lambda-dynamodb-policy"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:Scan",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "ndk-ky-dev-lambda-dynamodb-policy"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "query_construction" {
  function_name = "ndk-ky-dev-query-construction"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.lambda_zip.output_path

  environment {
    variables = {
      TABLE_NAME = "ndk-ky-dev-dynamodb-ConstructionMaster"
    }
  }

  timeout      = 10
  memory_size  = 128

  tags = {
    Name        = "ndk-ky-dev-query-construction"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}
