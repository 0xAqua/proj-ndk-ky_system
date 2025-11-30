variable "name_prefix" { type = string }

# 保存先 (DynamoDB)
variable "log_archive_table_name" { type = string }
variable "log_archive_table_arn" { type = string }

variable "target_log_group_names" {
  description = "List of CloudWatch Log Group Names to query"
  type        = list(string)
}