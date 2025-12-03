output "bucket_name" {
  value = aws_s3_bucket.this.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.this.id
}
