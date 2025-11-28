locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "aws_cognito_user_pool" "this" {
  name = "${local.name_prefix}-user-pool"

  username_attributes       = ["email"]
  auto_verified_attributes  = ["email"]
  mfa_configuration         = "OFF" # ← MFA は後で ON/OPTIONAL に変えればOK

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name_prefix}-web-client"
  user_pool_id = aws_cognito_user_pool.this.id

  # クライアントが使える認証フローを許可
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  supported_identity_providers          = ["COGNITO"]
  allowed_oauth_flows                   = ["code"]
  allowed_oauth_scopes                  = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client  = true
  generate_secret                       = false

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool" "this" {
  name = "${local.name_prefix}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = false
  }

  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    mutable             = true      # 後で変えたくなる可能性も考えて true 推奨
    required            = false     # いきなり必須にするとテスト時にちょっと面倒なので false で運用ルールで縛るのが無難
    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }
}