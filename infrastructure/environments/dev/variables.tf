# ─────────────────────────────
# 変数定義
# ─────────────────────────────
variable "root_domain" {
  description = "Root domain name (e.g. ndk-ky.com)"
  type        = string
  default     = "ndk-ky.com"
}

locals {
  project     = "ndk-ky"
  environment = "dev"
  region      = "ap-northeast-1"
}
