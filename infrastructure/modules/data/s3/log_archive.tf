# ─────────────────────────────
# ログ・証跡保存用バケット
# ─────────────────────────────
resource "aws_s3_bucket" "log_archive" {
  # ★修正: 変数 suffix を末尾に追加
  bucket = "${local.name_prefix}-log-archive${var.suffix}"

  tags = {
    Name        = "${local.name_prefix}-log-archive${var.suffix}"
    Project     = var.project
    Environment = var.environment
    Module      = "data-s3"
  }

  force_destroy = var.force_destroy
}

# 暗号化
resource "aws_s3_bucket_server_side_encryption_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# バージョニング
resource "aws_s3_bucket_versioning" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

# パブリックアクセスブロック
resource "aws_s3_bucket_public_access_block" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────
# CloudTrailからの書き込み許可ポリシー
# ─────────────────────────────
resource "aws_s3_bucket_policy" "allow_cloudtrail" {
  bucket = aws_s3_bucket.log_archive.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.log_archive.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = "s3:PutObject"

        # ★修正: パスを緩めてエラー(InsufficientS3BucketPolicyException)を回避
        Resource = "${aws_s3_bucket.log_archive.arn}/AWSLogs/*"

        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# ライフサイクルルール (任意)
resource "aws_s3_bucket_lifecycle_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  rule {
    id     = "archive-old-logs"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}