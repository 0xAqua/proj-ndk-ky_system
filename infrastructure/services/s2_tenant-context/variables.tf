variable "name_prefix" { type = string }

variable "construction_master_table_name" { type = string }
variable "construction_master_table_arn" { type = string }

# 共通AGW情報
variable "api_gateway_id" { type = string }
variable "api_gateway_execution_arn" { type = string }
variable "authorizer_id" {
  description = "API Gateway JWT Authorizer ID"
  type        = string
  default     = ""  # 空 = 認証なし（ログイン系用）
}

variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment encryption"
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

variable "origin_verify_secret" {
  description = "Secret to verify CloudFront origin"
  type        = string
  sensitive   = true
}


