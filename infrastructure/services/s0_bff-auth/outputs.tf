output "lambda_function_arn" {
  description = "BFF Auth Lambda function ARN"
  value       = aws_lambda_function.bff_auth.arn
}

output "lambda_function_name" {
  description = "BFF Auth Lambda function name"
  value       = aws_lambda_function.bff_auth.function_name
}

output "api_endpoint" {
  description = "BFF Auth API endpoint path"
  value       = "/bff/auth/*"
}