terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
    }
  }
}

# 共通のローカル変数定義
locals {
  name_prefix = "${var.project}-${var.environment}"
}