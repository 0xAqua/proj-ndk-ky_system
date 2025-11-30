output "log_archive_bucket_name" {
  description = "Name of the log archive bucket"
  value       = aws_s3_bucket.log_archive.bucket
}

output "log_archive_bucket_arn" {
  description = "ARN of the log archive bucket"
  value       = aws_s3_bucket.log_archive.arn
}