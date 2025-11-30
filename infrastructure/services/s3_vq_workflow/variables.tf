variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "region" {
  description = "AWS Region (e.g. ap-northeast-1)"
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