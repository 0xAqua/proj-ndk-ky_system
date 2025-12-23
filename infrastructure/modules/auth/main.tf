locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${local.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.this.id
}

# ─────────────────────────────
# User Pool 本体
# ─────────────────────────────
resource "aws_cognito_user_pool" "this" {
  name = "${local.name_prefix}-user-pool"

  # ★重要: 大文字小文字を区別しない設定（作成後の変更不可）
  username_configuration {
    case_sensitive = false
  }

  # セルフサインアップを無効化（管理者のみユーザー作成可能）
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # ★重要: 誤削除防止
  deletion_protection = "ACTIVE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  user_pool_tier = "PLUS"

  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  # ─────────────────────────────
  # MFA設定
  # ─────────────────────────────
  mfa_configuration = var.is_mfa_enabled ? "OPTIONAL" : "OFF"

  dynamic "software_token_mfa_configuration" {
    for_each = var.is_mfa_enabled ? [1] : []
    content {
      enabled = true
    }
  }

  # ─────────────────────────────
  # Passkey (WebAuthn) 設定
  # ドメイン取得後に有効化
  # ─────────────────────────────
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "WEB_AUTHN", "EMAIL_OTP"]
  }

  web_authn_configuration {
    relying_party_id  = var.webauthn_relying_party_id
    user_verification = "preferred"
  }

  # パスワードポリシー（強化済み）
  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # tenant_id カスタム属性
  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }


  # パスキー登録済みかどうかを管理するフラグ (0:未登録, 1:登録済)
  schema {
    name                = "has_passkey"
    attribute_data_type = "Number"
    mutable             = true
    required            = false
    number_attribute_constraints {
      min_value = 0
      max_value = 1
    }
  }

  # ユーザーのデバイス追跡
  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }

  # ユーザーアカウントの復旧設定
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # ─────────────────────────────
  # Email OTP カスタム認証トリガー
  # ─────────────────────────────
  dynamic "lambda_config" {
    for_each = var.define_auth_lambda_arn != null ? [1] : []
    content {
      define_auth_challenge          = var.define_auth_lambda_arn
      create_auth_challenge          = var.create_auth_lambda_arn
      verify_auth_challenge_response = var.verify_auth_lambda_arn
    }
  }
}

# ─────────────────────────────
# User Pool クライアント（React / SPA 用）
# ─────────────────────────────
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.this.id

  # トークンの取り消し（Revocation）を有効にする
  enable_token_revocation = true

  # パスワード認証(SRP)と、カスタム認証(OTP)の両方を許可します
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_AUTH"
  ]

  supported_identity_providers         = ["COGNITO"]
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  generate_secret = false

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # ユーザー存在エラーの隠蔽（セキュリティ対策）
  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 15   # 15分
  id_token_validity      = 15   # 15分
  refresh_token_validity = 1    # 1日

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # ★重要: テナントID書き換え防止設定
  write_attributes = [
    "email",
    "name",
    "custom:has_passkey"
  ]

  read_attributes = [
    "email",
    "email_verified",
    "name",
    "custom:tenant_id",
    "custom:has_passkey"
  ]
}

resource "aws_cognito_risk_configuration" "this" {
  user_pool_id = aws_cognito_user_pool.this.id

  # 侵害された資格情報の検出
  compromised_credentials_risk_configuration {
    event_filter = ["SIGN_IN", "SIGN_UP", "PASSWORD_CHANGE"]
    actions {
      event_action = "BLOCK"
    }
  }

  # アダプティブ認証（リスクベース）
  account_takeover_risk_configuration {
    # SES設定後に通知を有効化
    dynamic "notify_configuration" {
      for_each = var.ses_source_arn != null ? [1] : []
      content {
        source_arn = var.ses_source_arn
      }
    }

    actions {
      low_action {
        event_action = "NO_ACTION"
        notify       = false
      }
      medium_action {
        event_action = "MFA_IF_CONFIGURED"
        notify       = var.ses_source_arn != null
      }
      high_action {
        event_action = "MFA_REQUIRED"
        notify       = var.ses_source_arn != null
      }
    }
  }
}

resource "aws_cloudwatch_log_group" "cognito_user_activity" {
  name              = "/aws/cognito/${local.name_prefix}-user-pool/user-activity"
  retention_in_days = 90
}


