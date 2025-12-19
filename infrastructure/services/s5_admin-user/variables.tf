variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

# ─────────────────────────────
# Cognito
# ─────────────────────────────
variable "user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

# ─────────────────────────────
# DynamoDB
# ─────────────────────────────
variable "tenant_master_table_name" {
  description = "DynamoDB tenant master table name"
  type        = string
}

variable "tenant_master_table_arn" {
  description = "DynamoDB tenant master table ARN"
  type        = string
}

variable "tenant_user_master_table_name" {
  description = "DynamoDB tenant user master table name"
  type        = string
}

variable "tenant_user_master_table_arn" {
  description = "DynamoDB tenant user master table ARN"
  type        = string
}

# ─────────────────────────────
# API Gateway
# ─────────────────────────────
variable "api_gateway_id" {
  description = "API Gateway ID"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  type        = string
}

variable "authorizer_id" {
  description = "API Gateway JWT Authorizer ID"
  type        = string
}

# ─────────────────────────────
# KMS
# ─────────────────────────────
variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment variables"
  type        = string
}