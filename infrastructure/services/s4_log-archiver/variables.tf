variable "name_prefix" { type = string }
variable "region" { type = string }

# 保存先 (DynamoDB)
variable "log_archive_table_name" { type = string }
variable "log_archive_table_arn" { type = string }

# 収集対象のロググループ名リスト (s1, s2, s3...)
variable "target_log_group_arns" {
  description = "List of CloudWatch Log Group ARNs to query"
  type        = list(string)
}

variable "target_log_group_names" {
  description = "List of CloudWatch Log Group Names to query"
  type        = list(string)
}