locals {
  name_prefix = "${var.project}-${var.environment}"
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

  # ★重要: 誤削除防止（開発初期で頻繁に作り直す場合は "INACTIVE" にしてください）
  deletion_protection = "ACTIVE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # ─────────────────────────────
  # MFA (多要素認証) 設定
  # 将来: Passkey (FIDO2) と OTP を使用予定
  # 現状: 開発効率のため OFF
  # ─────────────────────────────
  mfa_configuration = "OFF" # 本番化に向け "OPTIONAL" または "ON" に変更

  # 将来MFAを有効化する際の OTP 設定（今はOFFなので影響しません）
  software_token_mfa_configuration {
    enabled = true
  }

  # 将来MFAを有効化する際の Passkey (WebAuthn) 設定
  # ※ Terraform Provider AWS v5.x以降で使用可能
  # user_pool_add_ons {
  #   advanced_security_mode = "AUDIT" # Passkey利用にはENFORCEDかAUDITが必要な場合あり
  # }
  # web_authn_configuration {
  #   relying_party_id = "auth.example.com" # 実際の認証ドメインに合わせて設定
  #   user_verification = "preferred"
  # }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
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

  # ユーザーのデバイス追跡（MFAのリスクベース認証などで将来役立つ）
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
}

# ─────────────────────────────
# User Pool クライアント（React / SPA 用）
# ─────────────────────────────
resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.this.id

  # MFA有効化時もこのフロー設定で対応可能
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    # Passkey/MFAを利用する場合は以下が必要になる可能性があります
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_CUSTOM_AUTH"
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

  # ★重要: テナントID書き換え防止設定
  # ユーザー（ブラウザ）からは書き込み不可にする
  # "custom:tenant_id" は絶対に含めない
  write_attributes = [
    "email",
    "name",
    "family_name",
    "given_name",
  ]

  # 読み取りはOK（アプリ内でテナント判定に使用）
  read_attributes = [
    "email",
    "email_verified",
    "name",
    "family_name",
    "given_name",
    "custom:tenant_id"
  ]
}

# ─────────────────────────────
# User Pool ドメイン（Hosted UI 用）
# ─────────────────────────────
resource "aws_cognito_user_pool_domain" "this" {
  domain       = "${local.name_prefix}-auth"
  user_pool_id = aws_cognito_user_pool.this.id
}