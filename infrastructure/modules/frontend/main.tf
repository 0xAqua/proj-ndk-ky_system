locals {
  bucket_name = "${var.name_prefix}-frontend"
}

# S3 バケット（静的ファイル置き場）
resource "aws_s3_bucket" "this" {
  bucket = local.bucket_name

  tags = merge(var.tags, {
    Name = local.bucket_name
  })
}

# バケットはフル private + OAC 経由でのみアクセスさせる想定
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────
# OAC（Origin Access Control）- 新方式
# ─────────────────────────────
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name_prefix}-frontend-oac"
  description                       = "OAC for ${var.name_prefix} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# OAC 用の S3 バケットポリシー
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
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })

  # CloudFront distribution が先に作成される必要がある
  depends_on = [aws_cloudfront_distribution.this]
}

# キャッシュポリシー（Managed）
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# API用: キャッシュ無効化ポリシー
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# API用: 全ヘッダー・クエリ・Cookieを転送
data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

# セキュリティヘッダー
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${var.name_prefix}-frontend-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      # ↓ ここを大幅に変更しました
      # Google Fonts, インラインスタイル, Cognito, APIへの通信を許可しています
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cognito-idp.ap-northeast-1.amazonaws.com https://*.execute-api.ap-northeast-1.amazonaws.com ${var.api_endpoint};"
      override                = true
    }
  }
}

resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.name_prefix}-frontend-cdn"
  price_class     = "PriceClass_200"

  aliases = var.alias_domain != "" ? [var.alias_domain] : []

  web_acl_id = var.web_acl_arn != "" ? var.web_acl_arn : null

  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.this.bucket_regional_domain_name
    origin_id                = "S3FrontendOrigin"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  # API Gateway オリジン（api_endpointが設定されている場合のみ）
  dynamic "origin" {
    for_each = var.api_endpoint != "" ? [1] : []
    content {
      domain_name = replace(replace(var.api_endpoint, "https://", ""), "/", "")
      origin_id   = "APIGatewayOrigin"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  # API用キャッシュビヘイビア（api_endpointが設定されている場合のみ）
  # /bff/* - 認証系API
  dynamic "ordered_cache_behavior" {
    for_each = var.api_endpoint != "" ? [1] : []
    content {
      path_pattern     = "/bff/*"
      target_origin_id = "APIGatewayOrigin"

      viewer_protocol_policy = "https-only"
      allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods         = ["GET", "HEAD"]

      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

      response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    }
  }

  # /construction-master* - 工事マスタAPI
  dynamic "ordered_cache_behavior" {
    for_each = var.api_endpoint != "" ? [1] : []
    content {
      path_pattern     = "/construction-master*"
      target_origin_id = "APIGatewayOrigin"

      viewer_protocol_policy = "https-only"
      allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods         = ["GET", "HEAD"]

      cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

      response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    }
  }

  default_cache_behavior {
    target_origin_id = "S3FrontendOrigin"

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # SPA用: 403 -> /index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  # SPA用: 404 -> /index.html
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["JP"]
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false

    acm_certificate_arn      = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method       = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  }
}
