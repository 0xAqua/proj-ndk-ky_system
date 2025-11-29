output "cloudfront_domain_name" {
  description = "CloudFront Domain Name (e.g. d1234.cloudfront.net)"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}