output "api_endpoint" {
  description = "API Gateway Endpoint URL"
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "lambda_function_arn" {
  value = aws_lambda_function.this.arn
}