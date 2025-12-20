data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# --- オリジンリクエストポリシー (追加) ---
data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewerExceptHostHeader"
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
resource "aws_cloudfront_function" "spa_routing" {
  name    = "${var.name_prefix}-spa-routing"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // 拡張子がない && ルート以外 → index.html
    if (uri !== '/' && !uri.includes('.')) {
        request.uri = '/index.html';
    }

    return request;
}
EOF
}

# --- CloudFront Distribution ---
resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  web_acl_id          = var.web_acl_arn

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
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
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

  # ★ custom_error_response は削除（コメントアウト or 削除）

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
  # viewer_certificate {
  #   acm_certificate_arn      = aws_acm_certificate.your_cert.arn
  #   ssl_support_method       = "sni-only"
  #   minimum_protocol_version = "TLSv1.2_2021"
  # }
  #
  # aliases = ["your-domain.com"]

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

