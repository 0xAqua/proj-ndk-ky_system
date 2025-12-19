variable "project" {
  type = string
}

variable "environment" {
  type = string
}

# ============================================================
# Cognito Hosted UI 用リダイレクトURL
# ------------------------------------------------------------
# マルチテナント方針メモ:
# - テナントごとに callback URL を増やすと管理が破綻するので、
#   「認証専用ドメイン 1つ（例: auth.example.com）」に集約する。
# - 各テナントサブドメイン (tenant-a.example.com 等) からのログインは
#   すべて Cognito → https://auth.example.com/callback に返してもらう。
# - テナント判定は:
#     1) フロントorバックエンドで state=tenant-a などを付与して Hosted UI へ
#     2) callback で state と IdToken の custom:tenant_id を突き合わせて検証
#     3) OKなら https://tenant-a.example.com へ再リダイレクト
# ============================================================
variable "callback_urls" {
  type = list(string)

  default = [
    # 採用する方針: 認証専用ドメイン 1つに集約
    "https://auth.example.com/callback",
    "http://localhost:3000/api/auth/callback"
  ]
}

# ============================================================
# ログアウト完了後のリダイレクトURL
# ------------------------------------------------------------
# - Cognito の /logout 完了後は、まず認証専用ドメイン
#   (例: https://auth.example.com/logout-complete) に戻す。
# - そこでセッションクッキー削除などを行い、
#   どのテナントに戻すかを判断して、各サブドメインに再リダイレクトする。
# ============================================================
variable "logout_urls" {
  type = list(string)

  default = [
    # "https://tenant-a.example.com/auth/logged-out", # テナントごとには増やさない
    "https://auth.example.com/logout-complete",
    "http://localhost:3000"
  ]
}

# ─────────────────────────────
# Email OTP カスタム認証 Lambda ARNs
# ─────────────────────────────
variable "define_auth_lambda_arn" {
  description = "Define Auth Challenge Lambda ARN"
  type        = string
  default     = null
}

variable "create_auth_lambda_arn" {
  description = "Create Auth Challenge Lambda ARN"
  type        = string
  default     = null
}

variable "verify_auth_lambda_arn" {
  description = "Verify Auth Challenge Lambda ARN"
  type        = string
  default     = null
}


variable "webauthn_relying_party_id" {
  description = "WebAuthn Relying Party ID (frontend domain)"
  type        = string
}

variable "is_mfa_enabled" {
  description = "MFA設定を有効にするかどうか (true=OPTIONAL, false=OFF)"
  type        = bool
  default     = false
}

