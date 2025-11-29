# ─────────────────────────────
# 1. AWS管理ポリシーの取得
# ─────────────────────────────
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewerExceptHostHeader"
}

# ─────────────────────────────
# 2. セキュリティヘッダーポリシーの作成
# ─────────────────────────────
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${var.name_prefix}-security-headers"

  security_headers_config {
    # HSTS: ブラウザに「次は絶対HTTPSで来てね」と強制する (セキュリティ必須)
    strict_transport_security {
      access_control_max_age_sec = 31536000 # 1年
      include_subdomains         = true
      override                   = true
    }

    # XSS対策など
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
  }
}

# ─────────────────────────────
# 3. CloudFront 本体
# ─────────────────────────────
resource "aws_cloudfront_distribution" "this" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${var.name_prefix}-api-cdn"
  price_class     = "PriceClass_200"

  # ★変更: alias_domain が空なら aliases を設定しない
  aliases = var.alias_domain != "" ? [var.alias_domain] : []

  web_acl_id = var.web_acl_arn != "" ? var.web_acl_arn : null

  origin {
    domain_name = var.api_gateway_domain
    origin_id   = "APIGatewayOrigin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGatewayOrigin"

    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    # ★ここに追加します！ (default_cache_behavior の中)
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ★変更: 証明書設定を条件分岐させる
  viewer_certificate {
    # ACM ARNがあれば false (独自)、なければ true (デフォルト)
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false

    # ACM ARNがある時だけ設定する (なければ null)
    acm_certificate_arn      = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method       = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  # 今は不要だが、将来のトラブルシューティング用メモ
  # for_each = {
  #   for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
  #     name   = dvo.resource_record_name
  #     record = dvo.resource_record_value
  #     type   = dvo.resource_record_type
  #   }
}