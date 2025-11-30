# ─────────────────────────────
# 1. Backup Vault (金庫)
# ─────────────────────────────
resource "aws_backup_vault" "this" {
  name = "${var.name_prefix}-vault"
  # KMSキーを指定しない場合はAWS管理キーが使われます（コスト安・管理楽）
}

# ─────────────────────────────
# 2. Backup Plan (スケジュール)
# ─────────────────────────────
resource "aws_backup_plan" "daily" {
  name = "${var.name_prefix}-daily-plan"

  rule {
    rule_name         = "DailyBackup"
    target_vault_name = aws_backup_vault.this.name

    # 毎日 AM 5:00 (UTC 20:00) に実行
    schedule = "cron(0 20 * * ? *)"

    # ライフサイクル: 30日後に削除
    lifecycle {
      delete_after = 30
    }
  }
}

# ─────────────────────────────
# 3. IAM Role for Backup
# ─────────────────────────────
resource "aws_iam_role" "backup_role" {
  name = "${var.name_prefix}-backup-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
    }]
  })
}

# AWS管理ポリシーをアタッチ (バックアップ & リストア権限)
resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# S3バックアップ用ポリシー (S3も対象にする場合必須)
resource "aws_iam_role_policy_attachment" "s3_backup" {
  role       = aws_iam_role.backup_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBackupServiceRolePolicyForS3Backup"
}

# ─────────────────────────────
# 4. Selection (対象リソースの選択)
# ─────────────────────────────
resource "aws_backup_selection" "this" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "${var.name_prefix}-selection"
  plan_id      = aws_backup_plan.daily.id

  # ★重要: タグで対象を指定する
  # "Project = ndk-ky" などのタグが付いているリソースを自動バックアップ
  selection_tag {
    type  = "STRINGEQUALS"
    key   = keys(var.selection_tags)[0]
    value = values(var.selection_tags)[0]
  }
}