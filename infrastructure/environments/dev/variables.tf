# ─────────────────────────────
# 変数定義
# ─────────────────────────────
variable "root_domain" {
  description = "Root domain name (e.g. ndk-ky.com)"
  type        = string
  default     = "ndk-ky.com"
}

locals {
  project     = "ndk-ky-system"
  environment = "dev"
  region      = "ap-northeast-1"
}

variable "enable_advanced_auth" {
  description = "MFA/Passkeyなどの高度な認証機能を有効にするか"
  type        = bool
  default     = false
}
