output "lambda_function_name" {
  value       = aws_lambda_function.tenant_config.function_name
  description = "Lambda関数名"
}

output "lambda_function_arn" {
  value       = aws_lambda_function.tenant_config.arn
  description = "Lambda関数ARN"
}

output "lambda_role_arn" {
  value       = aws_iam_role.lambda_role.arn
  description = "Lambda IAMロールARN"
}
