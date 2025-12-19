output "lambda_function_arn" {
  description = "ARN of the logs Lambda function"
  value       = aws_lambda_function.logs.arn
}

output "lambda_function_name" {
  description = "Name of the logs Lambda function"
  value       = aws_lambda_function.logs.function_name
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = aws_iam_role.lambda_role.arn
}
