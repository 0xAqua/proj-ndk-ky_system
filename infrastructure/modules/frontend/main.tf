variable "name_prefix" {}
variable "tags" {}

# ★追加: cdnモジュールで作ったCloudFrontのARNを受け取る変数
variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution to allow access from"
  type        = string
}

locals {
  bucket_name = "${var.name_prefix}-frontend"
}

# 1. S3 バケット (残す)
resource "aws_s3_bucket" "this" {
  bucket = local.bucket_name
  tags = merge(var.tags, {
    Name = local.bucket_name
  })
}

# 2. パブリックアクセスブロック (残す)
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. S3 バケットポリシー (修正して残す)
# OAC対応: 指定されたCloudFrontからのアクセスのみ許可
resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.this.arn}/*"
        Condition = {
          StringEquals = {
            # ★ここで変数を使用する
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}

# ★出力: バケット名をCDNモジュールに渡すために必要
output "s3_bucket_regional_domain_name" {
  value = aws_s3_bucket.this.bucket_regional_domain_name
}