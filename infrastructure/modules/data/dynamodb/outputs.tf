# S1
output "tenant_user_master_table_name" {
  value = aws_dynamodb_table.tenant_user_master.name
}

output "tenant_user_master_table_arn" {
  value = aws_dynamodb_table.tenant_user_master.arn
}

# S2
output "tenant_construction_master_table_name" {
  description = "Name of the Tenant Construction Master table"
  value       = aws_dynamodb_table.tenant_construction_master.name
}

output "tenant_construction_master_table_arn" {
  description = "ARN of the Tenant Construction Master table"
  value       = aws_dynamodb_table.tenant_construction_master.arn
}

# S3
output "tenant_vq_manager_table_name" {
  description = "Name of the Tenant VQ Manager table"
  value       = aws_dynamodb_table.tenant_vq_manager.name
}

output "tenant_vq_manager_table_arn" {
  description = "ARN of the Tenant VQ Manager table"
  value       = aws_dynamodb_table.tenant_vq_manager.arn
}

#s4
output "tenant_log_archive_table_name" {
  value = aws_dynamodb_table.tenant_log_archive.name
}

output "tenant_log_archive_table_arn" {
  value = aws_dynamodb_table.tenant_log_archive.arn
}

# OTP
output "otp_codes_table_name" {
  description = "OTP codes table name"
  value       = aws_dynamodb_table.otp_codes.name
}

output "otp_codes_table_arn" {
  description = "OTP codes table ARN"
  value       = aws_dynamodb_table.otp_codes.arn
}

output "tenant_master_table_name" {
  value = aws_dynamodb_table.tenant_master.name
}

output "tenant_master_table_arn" {
  value = aws_dynamodb_table.tenant_master.arn
}

# Auth Sessions (末尾に追加)
output "auth_sessions_table_name" {
  description = "Auth sessions table name"
  value       = aws_dynamodb_table.auth_sessions.name
}

output "auth_sessions_table_arn" {
  description = "Auth sessions table ARN"
  value       = aws_dynamodb_table.auth_sessions.arn
}

# Tenant Config Master
output "tenant_config_master_table_name" {
  description = "Tenant config master table name"
  value       = aws_dynamodb_table.tenant_config_master.name
}

output "tenant_config_master_table_arn" {
  description = "Tenant config master table ARN"
  value       = aws_dynamodb_table.tenant_config_master.arn
}