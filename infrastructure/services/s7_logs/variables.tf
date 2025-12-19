variable "name_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

# ─────────────────────────────
# DynamoDB Tables
# ─────────────────────────────
variable "tenant_vq_manager_table_name" {
  description = "Name of the Tenant VQ Manager table"
  type        = string
}

variable "tenant_vq_manager_table_arn" {
  description = "ARN of the Tenant VQ Manager table"
  type        = string
}

variable "tenant_user_master_table_name" {
  description = "Name of the Tenant User Master table"
  type        = string
}

variable "tenant_user_master_table_arn" {
  description = "ARN of the Tenant User Master table"
  type        = string
}

variable "tenant_log_archive_table_name" {
  description = "Name of the Tenant Log Archive table"
  type        = string
}

variable "tenant_log_archive_table_arn" {
  description = "ARN of the Tenant Log Archive table"
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
  description = "API Gateway authorizer ID"
  type        = string
}

# ─────────────────────────────
# KMS
# ─────────────────────────────
variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment variables encryption"
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

