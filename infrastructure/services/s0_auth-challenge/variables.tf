variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "otp_table_name" {
  description = "DynamoDB table name for OTP codes"
  type        = string
}

variable "otp_table_arn" {
  description = "DynamoDB table ARN for OTP codes"
  type        = string
}

variable "sender_email" {
  description = "Sender email address for OTP emails"
  type        = string
}

variable "ses_send_policy_arn" {
  description = "IAM policy ARN for SES SendEmail"
  type        = string
}

variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment encryption"
  type        = string
}
