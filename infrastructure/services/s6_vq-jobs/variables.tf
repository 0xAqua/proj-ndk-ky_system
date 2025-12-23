variable "project" {
  type        = string
  description = "プロジェクト名"
}

variable "environment" {
  type        = string
  description = "環境名 (dev, stg, prod)"
}

variable "name_prefix" {
  type        = string
  description = "リソース名のプレフィックス"
}

variable "api_gateway_id" {
  type        = string
  description = "API Gateway ID"
}

variable "api_gateway_execution_arn" {
  type        = string
  description = "API Gateway Execution ARN"
}

variable "authorizer_id" {
  type        = string
  description = "API Gateway Authorizer ID"
}

variable "tenant_vq_manager_table_name" {
  type        = string
  description = "tenant_vq_manager DynamoDB テーブル名"
}

variable "tenant_vq_manager_table_arn" {
  type        = string
  description = "tenant_vq_manager DynamoDB テーブル ARN"
}

variable "lambda_kms_key_arn" {
  type        = string
  description = "Lambda用KMSキーARN"
}


variable "session_table_name" {
  description = "Name of the DynamoDB table for sessions"
  type        = string
}

variable "session_table_arn" {
  description = "ARN of the DynamoDB table for sessions"
  type        = string
}

variable "origin_verify_secret" {
  description = "Secret to verify CloudFront origin"
  type        = string
  sensitive   = true
}

variable "origin_verify_authorizer_id" {
  type = string
}