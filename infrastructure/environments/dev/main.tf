# ─────────────────────────────
# 1. ネットワーク・DNS基盤 (Route53)
# ★一時的に無効化 (ドメイン未取得のため)
# ─────────────────────────────
# module "dns" {
#   source           = "../../modules/dns"
#   root_domain_name = var.root_domain
# }

# ─────────────────────────────
# 2. SSL証明書 (ACM)
# ★一時的に無効化
# ─────────────────────────────
# module "acm" {
#   source      = "../../modules/security/acm"
#   domain_name = var.root_domain
#   zone_id     = module.dns.zone_id
#   providers = {
#     aws = aws.virginia
#   }
# }

# ─────────────────────────────
# 3. 認証 (Cognito)
# ─────────────────────────────
module "auth" {
  source      = "../../modules/auth"
  project     = local.project
  environment = local.environment

  callback_urls = [
    "http://localhost:3000/callback",
    "https://${module.frontend.cloudfront_domain}/callback"
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://${module.frontend.cloudfront_domain}"
  ]

  # Email OTP トリガー（Step 2で有効化）
  define_auth_lambda_arn = module.auth_challenge.define_auth_lambda_arn
  create_auth_lambda_arn = module.auth_challenge.create_challenge_lambda_arn
  verify_auth_lambda_arn = module.auth_challenge.verify_challenge_lambda_arn

  webauthn_relying_party_id = local.environment == "dev" ? "localhost" : module.frontend.cloudfront_domain
}

# ─────────────────────────────
# 4. データストア (DynamoDB)
# ─────────────────────────────
module "dynamodb" {
  source      = "../../modules/data/dynamodb"
  project     = local.project
  environment = local.environment
}

# ─────────────────────────────
# 5. API Gateway (共通基盤)
# ─────────────────────────────
module "api_gateway" {
  source = "../../modules/api-gateway"

  allowed_origins = [
    "http://localhost:3000",
    "https://${module.frontend.cloudfront_domain}"
  ]

  name_prefix         = "${local.project}-${local.environment}"
  region              = local.region
  user_pool_id        = module.auth.user_pool_id
  user_pool_client_id = module.auth.user_pool_client_id
}

# ─────────────────────────────
# 6. バックエンドサービス (S1 Auth User)
# ─────────────────────────────
module "s1_auth_user" {
  source = "../../services/s1_auth-user"

  name_prefix = "${local.project}-${local.environment}-s1-auth-user"

  # DB情報
  tenant_user_master_table_name = module.dynamodb.tenant_user_master_table_name
  tenant_user_master_table_arn  = module.dynamodb.tenant_user_master_table_arn

  # AGW情報
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id
  user_pool_client_id       = module.auth.user_pool_client_id
  user_pool_id              = module.auth.user_pool_id

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

}

# ─────────────────────────────
# 6-2. バックエンドサービス (S2 Tenant Context)
# ─────────────────────────────
module "s2_tenant_context" {
  source = "../../services/s2_tenant-context"

  name_prefix = "${local.project}-${local.environment}-s2-context"

  # DB情報 (DynamoDBモジュールのoutputsに追加されている前提)
  construction_master_table_name = module.dynamodb.tenant_construction_master_table_name
  construction_master_table_arn  = module.dynamodb.tenant_construction_master_table_arn

  # AGW情報 (共通)
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn
}

# ─────────────────────────────
# 7. セキュリティ (WAF)
# ─────────────────────────────
module "waf" {
  source      = "../../modules/security/waf"
  name_prefix = "${local.project}-${local.environment}"

  providers = {
    aws = aws.virginia
  }
}

# ─────────────────────────────
# 8. CDN (CloudFront)
# ─────────────────────────────
module "cdn" {
  source = "../../modules/cdn"

  name_prefix = "${local.project}-${local.environment}"

  api_gateway_domain = replace(module.api_gateway.api_endpoint, "/^https?://([^/]*).*/", "$1")
  web_acl_arn        = module.waf.web_acl_arn

  # ★ドメインなし設定
  acm_certificate_arn = ""
  alias_domain        = ""
}

# ─────────────────────────────
# 8-2. Frontend (S3 + CloudFront)
# ─────────────────────────────
module "frontend" {
  source      = "../../modules/frontend"
  name_prefix = "${local.project}-${local.environment}"

  # まだ独自ドメインも ACM も使わないので空でOK
  acm_certificate_arn = ""
  alias_domain        = ""

  # WAF 共有したければここで付与
  web_acl_arn = module.waf.web_acl_arn

  tags = {
    Project     = local.project
    Environment = local.environment
  }
}

# ─────────────────────────────
# 9. DNSレコード登録 (API用サブドメイン)
# ★これも忘れずにコメントアウトしてください！
# ─────────────────────────────
# resource "aws_route53_record" "api" {
#   zone_id = module.dns.zone_id
#   name    = "api.${var.root_domain}"
#   type    = "A"
#
#   alias {
#     name                   = module.cdn.cloudfront_domain_name
#     zone_id                = "Z2FDTNDATAQYW2"
#     evaluate_target_health = false
#   }
# }

# ─────────────────────────────
# Outputs
# ─────────────────────────────
output "api_endpoint_original" {
  description = "Original API Gateway URL"
  value       = module.api_gateway.api_endpoint
}

output "api_endpoint_custom" {
  description = "Custom Domain API URL"
  value       = "Custom domain not configured"
}

output "cloudfront_domain" {
  value = module.cdn.cloudfront_domain_name
}

output "frontend_bucket_name" {
  description = "S3 bucket for frontend static files"
  value       = module.frontend.bucket_name
}

output "frontend_cloudfront_domain" {
  description = "CloudFront domain for frontend SPA"
  value       = module.frontend.cloudfront_domain
}

# ★これもコメントアウト（module.dnsがないため）
# output "nameservers" {
#   description = "Set these nameservers at your domain registrar"
#   value       = module.dns.nameservers
# }


# ─────────────────────────────
# 10. シークレット管理 (Secrets Manager)
# ─────────────────────────────
module "secrets" {
  source      = "../../modules/security/secrets-manager"
  name_prefix = "${local.project}-${local.environment}"
}

# ─────────────────────────────
# 11. ワークフロー (S3/S4 Producer-Worker)
# ─────────────────────────────
module "s3_vq_workflow" {
  source = "../../services/s3_vq_workflow"

  name_prefix = "${local.project}-${local.environment}-s3-vq"

  region = local.region # local.region は "ap-northeast-1" の値を持っています

  # DB情報 (Jobテーブルが必要なので、DynamoDBモジュールに追加が必要！)
  # ※ まだ modules/data/dynamodb に Jobテーブルを追加していなければ、追加が必要です。
  job_table_name = module.dynamodb.tenant_vq_manager_table_name
  job_table_arn  = module.dynamodb.tenant_vq_manager_table_arn

  # AGW情報
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id

  # ★追加: シークレット情報を渡す
  vq_secret_arn = module.secrets.vq_secret_arn
  env = local.environment  # これを追加

  # 外部API
  external_api_base_url = "https://ndknet.questella.biz"
  api_endpoint = module.api_gateway.api_endpoint

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn
}

# ─────────────────────────────
# 12. ログ収集基盤 (S4 Log Archiver)
# ─────────────────────────────
module "s4_log_archiver" {
  source = "../../services/s4_log-archiver"

  name_prefix = "${local.project}-${local.environment}-s4-log"
  region      = local.region

  # 保存先DB
  log_archive_table_name = module.dynamodb.tenant_log_archive_table_name
  log_archive_table_arn  = module.dynamodb.tenant_log_archive_table_arn

  # 収集対象のロググループ (s1, s2, s3...)
  target_log_group_names = [
    "/aws/lambda/${local.project}-${local.environment}-s1-auth-user",
    "/aws/lambda/${local.project}-${local.environment}-s2-context",
    "/aws/lambda/${local.project}-${local.environment}-s3-vq-producer",
    "/aws/lambda/${local.project}-${local.environment}-s3-vq-worker"
  ]

  target_log_group_arns = [] # 空でOK

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

}

module "s3_log_archive" {
  source      = "../../modules/data/s3"
  project     = local.project
  environment = local.environment
  suffix      = "-v2"
}
# ─────────────────────────────
# 13. 監査ログ (CloudTrail)
# ─────────────────────────────
module "cloudtrail" {
  source = "../../modules/security/cloudtrail"

  name_prefix    = "${local.project}-${local.environment}"
  s3_bucket_name = module.s3_log_archive.bucket_name
}

# ─────────────────────────────
# 14. バックアップ (AWS Backup)
# ─────────────────────────────
module "backup" {
  source      = "../../modules/data/backup"
  name_prefix = "${local.project}-${local.environment}"

  # ★このタグが付いているリソース(DynamoDB, S3等)を全てバックアップ対象にする
  selection_tags = {
    BackupTarget = "True"
  }
}

output "auth_user_pool_id" {
  value       = module.auth.user_pool_id
  description = "Cognito User Pool ID for dev"
}

output "auth_user_pool_client_id" {
  value       = module.auth.user_pool_client_id
  description = "Cognito User Pool Client ID for dev"
}


# ─────────────────────────────
# KMS (Lambda環境変数暗号化)
# ─────────────────────────────
module "kms" {
  source      = "../../modules/security/kms"
  name_prefix = "${local.project}-${local.environment}"
}

# ─────────────────────────────
# Auth Challenge (Email OTP)
# ─────────────────────────────
module "auth_challenge" {
  source      = "../../services/s0_auth-challenge"
  name_prefix = "${local.project}-${local.environment}-auth"

  user_pool_arn       = module.auth.user_pool_arn
  otp_table_name      = module.dynamodb.otp_codes_table_name
  otp_table_arn       = module.dynamodb.otp_codes_table_arn
  sender_email        = module.ses.sender_email
  ses_send_policy_arn = module.ses.ses_send_policy_arn
  lambda_kms_key_arn  = module.kms.lambda_key_arn
}

# ─────────────────────────────
# SES (Email OTP用)
# ─────────────────────────────
module "ses" {
  source       = "../../modules/security/ses"
  name_prefix  = "${local.project}-${local.environment}"
  sender_email = "tsuji.kodai@ndisol.com"  # Todo: どれにするか
}

# ─────────────────────────────
# 14. 脅威検知 (GuardDuty)
# ─────────────────────────────
module "guard-duty" {
  source = "../../modules/security/guard-duty"
}


