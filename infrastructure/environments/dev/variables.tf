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
  environment = terraform.workspace
  region      = "ap-northeast-1"
}

locals {
  allowed_origins_string = join(",", [
    "http://localhost:3000",
    "https://${module.cdn.cloudfront_domain_name}"
  ])
}

variable "enable_advanced_auth" {
  description = "MFA/Passkeyなどの高度な認証機能を有効にするか"
  type        = bool
  default     = false
}
