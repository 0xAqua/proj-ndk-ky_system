output "lambda_key_arn" {
  description = "KMS key ARN for Lambda environment encryption"
  value       = aws_kms_key.lambda.arn
}

output "lambda_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.lambda.key_id
}
