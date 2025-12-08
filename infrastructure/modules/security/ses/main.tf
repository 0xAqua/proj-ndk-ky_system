# ─────────────────────────────
# Amazon SES 設定
# Email OTP認証用のメール送信基盤
# ─────────────────────────────

# ─────────────────────────────
# 1. 開発用: メールアドレス単体検証
# SESサンドボックス環境では検証済みメールにのみ送信可能
# ─────────────────────────────
resource "aws_ses_email_identity" "sender" {
  count = var.domain_name == "" ? 1 : 0
  email = var.sender_email
}

# ─────────────────────────────
# 2. 本番用: ドメイン検証（ドメイン取得後に有効化）
# ─────────────────────────────
resource "aws_ses_domain_identity" "this" {
  count  = var.domain_name != "" ? 1 : 0
  domain = var.domain_name
}

# DKIM設定（なりすまし防止）
resource "aws_ses_domain_dkim" "this" {
  count  = var.domain_name != "" ? 1 : 0
  domain = aws_ses_domain_identity.this[0].domain
}

# ─────────────────────────────
# 3. Route53 DNS レコード（ドメイン検証用）
# ドメイン取得後に有効化
# ─────────────────────────────
# resource "aws_route53_record" "ses_verification" {
#   count   = var.domain_name != "" && var.zone_id != "" ? 1 : 0
#   zone_id = var.zone_id
#   name    = "_amazonses.${var.domain_name}"
#   type    = "TXT"
#   ttl     = 600
#   records = [aws_ses_domain_identity.this[0].verification_token]
# }

# resource "aws_route53_record" "ses_dkim" {
#   count   = var.domain_name != "" && var.zone_id != "" ? 3 : 0
#   zone_id = var.zone_id
#   name    = "${aws_ses_domain_dkim.this[0].dkim_tokens[count.index]}._domainkey.${var.domain_name}"
#   type    = "CNAME"
#   ttl     = 600
#   records = ["${aws_ses_domain_dkim.this[0].dkim_tokens[count.index]}.dkim.amazonses.com"]
# }

# ─────────────────────────────
# 4. SES設定セット（バウンス・苦情のトラッキング用）
# ─────────────────────────────
resource "aws_ses_configuration_set" "this" {
  name = "${var.name_prefix}-email-config"

  reputation_metrics_enabled = true
  sending_enabled            = true
}

# ─────────────────────────────
# 5. メール送信用IAMポリシー
# Lambda等からSESを呼び出すためのポリシー
# ─────────────────────────────
data "aws_iam_policy_document" "ses_send" {
  statement {
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"]

    # 送信元を制限（なりすまし防止）
    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = var.domain_name != "" ? ["*@${var.domain_name}"] : [var.sender_email]
    }
  }
}

resource "aws_iam_policy" "ses_send" {
  name   = "${var.name_prefix}-ses-send-policy"
  policy = data.aws_iam_policy_document.ses_send.json
}
