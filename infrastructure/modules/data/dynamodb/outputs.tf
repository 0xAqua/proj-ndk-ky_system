output "tenant_user_master_table_name" {
  description = "DynamoDB table name for TenantUserMaster"
  value       = aws_dynamodb_table.tenant_user_master.name
}

output "tenant_user_master_table_arn" {
  description = "DynamoDB table ARN for TenantUserMaster"
  value       = aws_dynamodb_table.tenant_user_master.arn
}
