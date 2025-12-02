# ─────────────────────────────
# ログ・証跡保存用バケット
# CloudTrailやLambdaのアーカイブログを保存
# ─────────────────────────────
resource "aws_s3_bucket" "log_archive" {
  bucket = "${local.name_prefix}-log-archive"
  # ※ バケット名はグローバルユニークである必要があります

  tags = {
    Name        = "${local.name_prefix}-log-archive"
    Project     = var.project
    Environment = var.environment
    Module      = "data-s3"
  }

  # 開発中はOK、本番ではfalse推奨 Todo
  force_destroy = true
}

# 暗号化 (必須)
resource "aws_s3_bucket_server_side_encryption_configuration" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# バージョニング (監査ログ誤削除防止)
resource "aws_s3_bucket_versioning" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id
  versioning_configuration {
    status = "Enabled"
  }
}

# パブリックアクセスブロック (完全非公開)
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
data "aws_caller_identity" "current" {}

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
        Resource = "${aws_s3_bucket.log_archive.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

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
      days = 365  # 1年後に削除（要件に応じて調整）
    }
  }
}

resource "aws_s3_bucket_logging" "log_archive" {
  bucket = aws_s3_bucket.log_archive.id

  target_bucket = aws_s3_bucket.log_archive.id  # 自己参照 or 別バケット
  target_prefix = "access-logs/"
}