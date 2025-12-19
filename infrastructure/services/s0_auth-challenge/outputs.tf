output "define_auth_lambda_arn" {
  description = "Define Auth Challenge Lambda ARN"
  value       = aws_lambda_function.define_auth.arn
}

output "create_challenge_lambda_arn" {
  description = "Create Auth Challenge Lambda ARN"
  value       = aws_lambda_function.create_challenge.arn
}

output "verify_challenge_lambda_arn" {
  description = "Verify Auth Challenge Lambda ARN"
  value       = aws_lambda_function.verify_challenge.arn
}

output "define_auth_lambda_name" {
  description = "Define Auth Challenge Lambda function name"
  value       = aws_lambda_function.define_auth.function_name
}

output "create_challenge_lambda_name" {
  description = "Create Auth Challenge Lambda function name"
  value       = aws_lambda_function.create_challenge.function_name
}

output "verify_challenge_lambda_name" {
  description = "Verify Auth Challenge Lambda function name"
  value       = aws_lambda_function.verify_challenge.function_name
}
