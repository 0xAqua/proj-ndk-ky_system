variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "region" {
  description = "AWS Region"
  type        = string
}

# ─────────────────────────────
# DynamoDB (Job管理用)
# ─────────────────────────────
variable "job_table_name" {
  description = "Name of the DynamoDB table for Job management"
  type        = string
}

variable "job_table_arn" {
  description = "ARN of the DynamoDB table for Job management"
  type        = string
}

# ─────────────────────────────
# Secrets Manager (VQ API Key)
# ─────────────────────────────
variable "vq_secret_arn" {
  description = "ARN of the Secrets Manager secret storing VQ API keys"
  type        = string
}

# ─────────────────────────────
# API Gateway (共通基盤)
# ─────────────────────────────
variable "api_gateway_id" {
  description = "ID of the shared API Gateway"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "Execution ARN of the shared API Gateway"
  type        = string
}

variable "authorizer_id" {
  description = "ID of the Cognito JWT Authorizer"
  type        = string
}

variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment encryption"
  type        = string
}

variable "external_api_base_url" {
  description = "Base URL for the external VQ API (e.g. https://ndis.questella.biz)"
  type        = string
}

variable "api_endpoint" {
  description = "The base URL of the API Gateway"
  type        = string
}

variable "env" {
  description = "Environment (dev, stg, prod)"
  type        = string
}

variable "session_table_name" {
  description = "Name of the DynamoDB table for sessions"
  type        = string
}

variable "session_table_arn" {
  description = "ARN of the DynamoDB table for sessions"
  type        = string
}
