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