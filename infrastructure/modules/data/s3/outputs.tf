output "bucket_name" {
  description = "Name of the log archive bucket"
  value       = aws_s3_bucket.log_archive.id
}

output "bucket_arn" {
  description = "ARN of the log archive bucket"
  value       = aws_s3_bucket.log_archive.arn
}
