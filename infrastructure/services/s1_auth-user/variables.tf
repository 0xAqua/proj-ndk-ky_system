variable "name_prefix" {
  description = "Resource name prefix (e.g. ndk-ky-dev-s1-auth-user)"
  type        = string
}

variable "tenant_user_master_table_name" {
  description = "DynamoDB Table Name"
  type        = string
}

variable "tenant_user_master_table_arn" {
  description = "DynamoDB Table ARN (for IAM policy)"
  type        = string
}

# 親モジュールから受け取る共通AGWの情報
variable "api_gateway_id" {
  type = string

}
variable "api_gateway_execution_arn" { type = string }


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

variable "allowed_origins" {
  description = "CORS許可オリジン（カンマ区切り）"
  type        = string
  default     = ""
}


variable "authorizer_id" {
  description = "API Gateway Authorizer ID"
  type        = string
}

variable "origin_verify_secret" {
  description = "Secret to verify CloudFront origin"
  type        = string
  sensitive   = true
}

# --- 追加分: 工事マスタ関連 ---
variable "construction_master_table_name" {
  description = "工事マスタのDynamoDBテーブル名"
  type        = string
}

variable "construction_master_table_arn" {
  description = "工事マスタのDynamoDBテーブルARN (IAM用)"
  type        = string
}