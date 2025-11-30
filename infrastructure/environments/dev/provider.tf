terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.22.0"
    }
  }

  backend "local" {
    path = "./terraform.tfstate"
  }
}

# ─────────────────────────────
# 1. メインのプロバイダ (東京)
# ─────────────────────────────
provider "aws" {
  region  = "ap-northeast-1"
  profile = "proj-ndk-ky" # ★ここが重要！WAFと同じプロファイルを指定

  default_tags {
    tags = {
      CostID  = "NDK-KI"
      Project = "ndk-ky"
    }
  }
}

# ─────────────────────────────
# 2. WAF/ACM用のプロバイダ (バージニア)
# ─────────────────────────────
provider "aws" {
  alias   = "virginia"
  region  = "us-east-1"
  profile = "proj-ndk-ky" # ★ここも同じプロファイル

  default_tags {
    tags = {
      CostID  = "NDK-KI"
      Project = "ndk-ky"
      Module  = "global-security"
    }
  }
}