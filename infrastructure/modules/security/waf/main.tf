terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # 親からバージニアリージョンのプロバイダを受け取る設定
      configuration_aliases = [ aws ]
    }
  }
}

# CloudFront用のWAFは "CLOUDFRONT" スコープで作成
resource "aws_wafv2_web_acl" "this" {
  name        = "${var.name_prefix}-cf-waf"
  description = "WAF for CloudFront - Global"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-cf-waf"
    sampled_requests_enabled   = true
  }

  # ─────────────────────────────
  # ルール1: AWS管理ルールセット (CommonRuleSet)
  # OWASP Top 10 などの一般的なWeb攻撃を防ぐ
  # ─────────────────────────────
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 10

    # ★修正: 1行で書かずに改行する
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ─────────────────────────────
  # ルール2: 既知の不正入力 (KnownBadInputs)
  # ─────────────────────────────
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    # ★修正
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # SQLインジェクション対策を追加
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 25

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ─────────────────────────────
  # ルール3: Amazon IP評価リスト (AmazonIpReputationList)
  # ─────────────────────────────
  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 30

    # ★修正
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  # ─────────────────────────────
  # ルール4: Linux OS攻撃対策 (Lambda保護用)
  # ─────────────────────────────
  rule {
    name     = "AWS-AWSManagedRulesLinuxRuleSet"
    priority = 40

    # ★修正
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesLinuxRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ─────────────────────────────
  # ルール5: レートベースルール (DDoS対策)
  # 同一IPから 5分間に 2000リクエスト を超えたらブロック
  # ─────────────────────────────
  rule {
    name     = "RateLimit-2000"
    priority = 50

    # ★修正
    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit-2000"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "GeoBlock-NonJP"
    priority = 5 # 他のルールより先に判定させる

    action {
      block {} # ブロックする
    }

    statement {
      not_statement {
        statement {
          geo_match_statement {
            country_codes = ["JP"] # 日本(JP)「以外(NOT)」ならブロック
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlock-NonJP"
      sampled_requests_enabled   = true
    }
  }
}

