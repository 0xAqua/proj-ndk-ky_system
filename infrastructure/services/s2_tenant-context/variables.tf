variable "name_prefix" { type = string }

variable "construction_master_table_name" { type = string }
variable "construction_master_table_arn" { type = string }

# 共通AGW情報
variable "api_gateway_id" { type = string }
variable "api_gateway_execution_arn" { type = string }
variable "authorizer_id" { type = string }