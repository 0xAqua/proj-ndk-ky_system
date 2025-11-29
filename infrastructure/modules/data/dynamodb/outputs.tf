output "tenant_user_master_table_name" {
  value = aws_dynamodb_table.tenant_user_master.name
}

output "tenant_user_master_table_arn" {
  value = aws_dynamodb_table.tenant_user_master.arn
}