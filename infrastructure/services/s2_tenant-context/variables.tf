variable "name_prefix" { type = string }

variable "construction_master_table_name" { type = string }
variable "construction_master_table_arn" { type = string }

# 共通AGW情報
variable "api_gateway_id" { type = string }
variable "api_gateway_execution_arn" { type = string }
variable "authorizer_id" { type = string }

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