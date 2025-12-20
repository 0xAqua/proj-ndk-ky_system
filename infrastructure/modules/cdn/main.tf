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
  bucket = "${var.name_prefix}-frontend-hosting"
}

# OAC (S3保護)
resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name_prefix}-s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# パス書き換え (Viteのproxy再現)
resource "aws_cloudfront_function" "api_rewrite" {
  name    = "${var.name_prefix}-api-rewrite"
  runtime = "cloudfront-js-1.0"
  publish = true
  code    = <<EOF
function handler(event) {
    var request = event.request;
    if (request.uri.startsWith('/api/v1/')) {
        request.uri = request.uri.replace('/api/v1/', '/');
    }
    return request;
}
EOF
}

# CloudFront本体
resource "aws_cloudfront_distribution" "this" {
  enabled = true

  # ★ WAFの紐付け（作成した aws_wafv2_web_acl の ARN を指定）
  web_acl_id = var.web_acl_arn

  # API Gateway オリジン
  origin {
    domain_name = var.api_gateway_domain # rootから渡される
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

  # API用設定 (/api/v1/*)
  ordered_cache_behavior {
    path_pattern     = "/api/v1/*"
    target_origin_id = "APIGateway"

    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    viewer_protocol_policy = "redirect-to-https"

    # ★ AWS マネージドポリシー ID を直接指定（ベストプラクティス）
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.api_rewrite.arn
    }
  }

  # デフォルト (S3)
  default_cache_behavior {
    target_origin_id       = "S3Origin"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id  = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  # SPA対応 (404をindex.htmlへ)
  custom_error_response {
    error_code = 404
    response_code = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}