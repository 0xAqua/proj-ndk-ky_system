variable "name_prefix" { type = string }

variable "region" {
  description = "AWS Region"
  type        = string
}

# 保存先 (DynamoDB)
variable "log_archive_table_name" { type = string }
variable "log_archive_table_arn" { type = string }

# 収集対象のロググループ名
variable "target_log_group_names" {
  description = "List of CloudWatch Log Group Names to query"
  type        = list(string)
}

# 親で target_log_group_arns = [] を渡しているので、定義が必要です
variable "target_log_group_arns" {
  description = "List of CloudWatch Log Group ARNs (Optional)"
  type        = list(string)
  default     = []
}

variable "lambda_kms_key_arn" {
  description = "KMS key ARN for Lambda environment encryption"
  type        = string
}