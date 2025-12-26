output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "user_pool_domain" {
  value = aws_cognito_user_pool_domain.this.domain
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "cognito_log_group_name" {
  value = aws_cloudwatch_log_group.cognito_user_activity.name
}

output "cognito_log_group_arn" {
  value = aws_cloudwatch_log_group.cognito_user_activity.arn
}