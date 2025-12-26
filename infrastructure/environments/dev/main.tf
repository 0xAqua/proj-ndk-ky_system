# ─────────────────────────────
# 3. 認証 (Cognito)
# ─────────────────────────────
module "auth" {
  source      = "../../modules/auth"
  project     = local.project
  environment = local.environment

  callback_urls = [
    "http://localhost:3000/callback",
    "https://ndknet.kytest.weeeef.com/callback",
    "https://ndisol.kytest.weeeef.com/callback",
    "https://kytest.weeeef.com/callback"
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://ndknet.kytest.weeeef.com",
    "https://ndisol.kytest.weeeef.com",
    "https://kytest.weeeef.com"
  ]

  # Passkeyの有無
  is_mfa_enabled = var.enable_advanced_auth
  # Email OTP トリガー（Step 2で有効化）
  define_auth_lambda_arn = module.auth_challenge.define_auth_lambda_arn
  create_auth_lambda_arn = module.auth_challenge.create_challenge_lambda_arn
  verify_auth_lambda_arn = module.auth_challenge.verify_challenge_lambda_arn

  webauthn_relying_party_id = local.environment == "dev" ? "localhost" : module.cdn.cloudfront_domain_name
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

  allowed_origins = []

  name_prefix         = "${local.project}-${local.environment}"
  region              = local.region
  user_pool_id        = module.auth.user_pool_id
  user_pool_client_id = module.auth.user_pool_client_id
  origin_verify_secret = module.secrets.origin_verify_secret_value  # ← これだけでOK
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

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  # セッション
  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  # ★追加
  allowed_origins = local.allowed_origins_string
  origin_verify_secret = module.secrets.origin_verify_secret_value

  authorizer_id = module.api_gateway.authorizer_id
  construction_master_table_name = module.dynamodb.tenant_construction_master_table_name
  construction_master_table_arn  = module.dynamodb.tenant_construction_master_table_arn

  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id


}

# ─────────────────────────────
# 6-5. バックエンドサービス (S5 Admin User)
# ─────────────────────────────
module "s5_admin_user" {
  source = "../../services/s5_admin-user"

  name_prefix = "${local.project}-${local.environment}-s5-admin-user"

  # Cognito
  user_pool_id  = module.auth.user_pool_id
  user_pool_arn = module.auth.user_pool_arn

  # DynamoDB
  tenant_master_table_name      = module.dynamodb.tenant_master_table_name
  tenant_master_table_arn       = module.dynamodb.tenant_master_table_arn
  tenant_user_master_table_name = module.dynamodb.tenant_user_master_table_name
  tenant_user_master_table_arn  = module.dynamodb.tenant_user_master_table_arn

  # API Gateway
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  origin_verify_secret = module.secrets.origin_verify_secret_value
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id


}


# ─────────────────────────────
# 6-6. バックエンドサービス (S6 VQ Jobs)
# ─────────────────────────────
module "s6_vq_jobs" {
  source = "../../services/s6_vq-jobs"

  project     = local.project
  environment = local.environment
  name_prefix = "${local.project}-${local.environment}-s6-vq-jobs"

  # API Gateway
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id

  # DynamoDB
  tenant_vq_manager_table_name = module.dynamodb.tenant_vq_manager_table_name
  tenant_vq_manager_table_arn  = module.dynamodb.tenant_vq_manager_table_arn

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  origin_verify_secret = module.secrets.origin_verify_secret_value
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id

}

# ─────────────────────────────
# 6-7. バックエンドサービス (S7 Logs)
# ─────────────────────────────
module "s7_logs" {
  source = "../../services/s7_logs"

  name_prefix = "${local.project}-${local.environment}-s7-logs"

  # DynamoDB
  tenant_vq_manager_table_name   = module.dynamodb.tenant_vq_manager_table_name
  tenant_vq_manager_table_arn    = module.dynamodb.tenant_vq_manager_table_arn
  tenant_user_master_table_name  = module.dynamodb.tenant_user_master_table_name
  tenant_user_master_table_arn   = module.dynamodb.tenant_user_master_table_arn
  tenant_log_archive_table_name  = module.dynamodb.tenant_log_archive_table_name
  tenant_log_archive_table_arn   = module.dynamodb.tenant_log_archive_table_arn

  # ★ アクセス履歴テーブル
  access_history_table_name = module.dynamodb.access_history_table_name
  access_history_table_arn  = module.dynamodb.access_history_table_arn

  # ★ Cognito
  user_pool_id  = module.auth.user_pool_id
  user_pool_arn = module.auth.user_pool_arn

  # ★ Cognito CloudWatch Logs（auth モジュールから取得）
  cognito_log_group_name = module.auth.cognito_log_group_name
  cognito_log_group_arn  = module.auth.cognito_log_group_arn

  # API Gateway
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  authorizer_id             = module.api_gateway.authorizer_id
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  origin_verify_secret = module.secrets.origin_verify_secret_value
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
# ─────────────────────────────
# ACM証明書（片井さんが作成したもの）を参照
# ─────────────────────────────
data "aws_acm_certificate" "main" {
  provider = aws.virginia
  domain   = "*.kytest.weeeef.com"
  statuses = ["ISSUED"]
}

module "cdn" {
  source = "../../modules/cdn"

  name_prefix = "${local.project}-${local.environment}"

  api_gateway_domain = replace(module.api_gateway.api_endpoint, "/^https?://([^/]*).*/", "$1")
  web_acl_arn        = module.waf.web_acl_arn

  acm_certificate_arn  = data.aws_acm_certificate.main.arn

  alias_domains = [
    "ndknet.kytest.weeeef.com",
    "ndisol.kytest.weeeef.com",
    "kytest.weeeef.com"
  ]

  origin_verify_secret = module.secrets.origin_verify_secret_value
}

# ─────────────────────────────
# 9. DNSレコード登録 (API用サブドメイン)
# ★これも忘れずにコメントアウトしてください！
# ─────────────────────────────
# resource "aws_route53_record" "client" {
#   zone_id = module.dns.zone_id
#   name    = "client.${var.root_domain}"
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
  value       = module.cdn.bucket_name
}

output "frontend_cloudfront_domain" {
  description = "CloudFront domain for frontend SPA"
  value       = module.cdn.cloudfront_domain_name
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
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id

  # ★追加: シークレット情報を渡す
  vq_secret_arn = module.secrets.vq_secret_arn
  env = local.environment  # これを追加

  # 外部API
  external_api_base_url = "https://ndknet.questella.biz"
  api_endpoint = module.api_gateway.api_endpoint

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  origin_verify_secret = module.secrets.origin_verify_secret_value

  tenant_config_table_name = module.dynamodb.tenant_config_master_table_name
  tenant_config_table_arn  = module.dynamodb.tenant_config_master_table_arn

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
    "/aws/lambda/${local.project}-${local.environment}-s3-vq-worker",
    "/aws/lambda/${local.project}-${local.environment}-s4-log",
    "/aws/lambda/${local.project}-${local.environment}-auth-create-challenge",
    "/aws/lambda/${local.project}-${local.environment}-auth-define-auth",
    "/aws/lambda/${local.project}-${local.environment}-auth-verify-challenge"
  ]

  target_log_group_arns = [] # 空でOK

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn

  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

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


# ─────────────────────────────
# 16. BFF認証API (HttpOnly Cookie管理)
# ─────────────────────────────
module "bff_auth" {
  source = "../../services/s0_bff-auth"

  name_prefix = "${local.project}-${local.environment}-s0-bff-auth"

  # ★ 修正: module.dynamodb から直接取得するように変更
  tenant_user_master_table_name = module.dynamodb.tenant_user_master_table_name
  tenant_user_master_table_arn  = module.dynamodb.tenant_user_master_table_arn

  # Cognito
  user_pool_id        = module.auth.user_pool_id
  user_pool_client_id = module.auth.user_pool_client_id

  # DynamoDB (セッション管理)
  auth_sessions_table_name = module.dynamodb.auth_sessions_table_name
  auth_sessions_table_arn  = module.dynamodb.auth_sessions_table_arn

  # API Gateway
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn
  kms_key_id = module.kms.lambda_key_id

  # CORS設定
  allowed_origins = [
    "http://localhost:3000",
    "https://ndknet.kytest.weeeef.com",
    "https://ndisol.kytest.weeeef.com",
    "https://kytest.weeeef.com"
  ]

  tenant_config_table_name = module.dynamodb.tenant_config_master_table_name
  tenant_config_table_arn  = module.dynamodb.tenant_config_master_table_arn

}

# ─────────────────────────────
# 6-8. バックエンドサービス (S8 Tenant Config)
# ─────────────────────────────
module "s8_tenant_config" {
  source = "../../services/s8_tenant-config"

  project     = local.project
  environment = local.environment
  name_prefix = "${local.project}-${local.environment}-s8-tenant-config"

  # API Gateway
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.api_execution_arn
  origin_verify_authorizer_id = module.api_gateway.origin_verify_authorizer_id

  # DynamoDB
  tenant_config_table_name = module.dynamodb.tenant_config_master_table_name
  tenant_config_table_arn  = module.dynamodb.tenant_config_master_table_arn

  # Session
  session_table_name = module.dynamodb.auth_sessions_table_name
  session_table_arn  = module.dynamodb.auth_sessions_table_arn

  # KMS
  lambda_kms_key_arn = module.kms.lambda_key_arn
}
