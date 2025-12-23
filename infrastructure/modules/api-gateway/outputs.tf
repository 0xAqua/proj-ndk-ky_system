output "api_id" {
  description = "The API Gateway ID"
  value       = aws_apigatewayv2_api.this.id
}

output "api_execution_arn" {
  description = "The API Gateway Execution ARN (for Lambda permissions)"
  value       = aws_apigatewayv2_api.this.execution_arn
}

output "authorizer_id" {
  description = "The Cognito JWT Authorizer ID"
  value       = aws_apigatewayv2_authorizer.jwt.id
}

output "api_endpoint" {
  description = "The API Gateway Endpoint URL"
  value       = aws_apigatewayv2_api.this.api_endpoint
}
