# ─────────────────────────────
# CloudTrail (監査ログ)
# ─────────────────────────────
resource "aws_cloudtrail" "audit_trail" {
  name                          = "${var.name_prefix}-audit-trail"
  s3_bucket_name                = var.s3_bucket_name

  # ベストプラクティス設定
  include_global_service_events = true # IAMなどのグローバル操作も記録
  is_multi_region_trail         = true # 全リージョンの操作を記録
  enable_log_file_validation    = true # ログの改ざん検知を有効化

  # CloudWatch Logsへの送信はOFF (S3のみでOK)
  # cloud_watch_logs_group_arn = ...
}