variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  type        = string
}

variable "auth_sessions_table_name" {
  description = "DynamoDB table name for session storage"
  type        = string
}

variable "auth_sessions_table_arn" {
  description = "DynamoDB table ARN for session storage"
  type        = string
}

variable "api_gateway_id" {
  description = "API Gateway REST API ID"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  type        = string
}

variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment variable encryption"
  type        = string
}

variable "allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
}