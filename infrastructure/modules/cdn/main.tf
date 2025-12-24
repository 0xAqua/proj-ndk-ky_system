data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# --- レスポンスヘッダーポリシー (追加) ---
data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

# S3バケット
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.name_prefix}-frontend"
}

# OAC (S3保護)
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name_prefix}-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# API用: パス書き換え
resource "aws_cloudfront_function" "api_rewrite" {
  name    = "${var.name_prefix}-api-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<EOF
function handler(event) {
    var request = event.request;
    // /api/v1/xxx を /xxx に書き換え
    // Viteの rewrite: (path) => path.replace(/^\/api\/v1/, '') と同じ処理
    request.uri = request.uri.replace('/api/v1/', '/');
    return request;
}
EOF
}

# SPA用: 拡張子なしパスはindex.htmlへ
# SPA用: リダイレクト + ルーティング（統合版）
resource "aws_cloudfront_function" "spa_routing" {
  name    = "${var.name_prefix}-spa-routing"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<EOF
function handler(event) {
    var request = event.request;
    var host = request.headers.host.value;
    var uri = request.uri;

    // CloudFrontデフォルトドメインならリダイレクト
    if (host.endsWith('.cloudfront.net')) {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://${var.alias_domains[0]}' + uri }
            }
        };
    }

    // 拡張子がない && ルート以外 → index.html
    if (uri !== '/' && !uri.includes('.')) {
        request.uri = '/index.html';
    }

    return request;
}
EOF
}

resource "aws_cloudfront_origin_request_policy" "api_policy" {
  name    = "${var.name_prefix}-api-origin-policy"
  comment = "Forward necessary headers to API Gateway"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# --- CloudFront Distribution ---
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  web_acl_id          = var.web_acl_arn

  # ★追加: 料金クラス（日本含むアジア対応）
  price_class = "PriceClass_200"

  # API Gateway オリジン
  origin {
    domain_name = var.api_gateway_domain
    origin_id   = "APIGateway"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_secret
    }
  }

  # S3 オリジン
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  # API用 (/api/v1/*)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/*"
    target_origin_id = "APIGateway"

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_disabled.id
    # ★修正: カスタムポリシーに変更
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api_policy.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_rewrite.arn
    }
  }

  # デフォルト (S3 + SPA)
  default_cache_behavior {
    target_origin_id       = "S3Origin"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routing.arn
    }
  }

  logging_config {
    include_cookies = false  # ← Cookie は含めない（セキュリティ）
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "cloudfront/"
  }

  restrictions {
    geo_restriction {
      restriction_type = "whitelist"  # ← "none" から変更
      locations        = ["JP"]       # ← 日本のみ許可
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = var.alias_domains
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.this.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ログ用S3バケット
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "${var.name_prefix}-cloudfront-logs"
}

resource "aws_s3_bucket_ownership_controls" "cloudfront_logs" {
  bucket = aws_s3_bucket.cloudfront_logs.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "cloudfront_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.cloudfront_logs]
  bucket     = aws_s3_bucket.cloudfront_logs.id
  acl        = "private"
}


