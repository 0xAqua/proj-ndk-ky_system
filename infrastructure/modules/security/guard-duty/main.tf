resource "aws_guardduty_detector" "this" {
  enable = true
}

resource "aws_guardduty_detector_feature" "s3_logs" {
  detector_id = aws_guardduty_detector.this.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

# Malware Protection (S3) の有効化
resource "aws_guardduty_detector_feature" "malware_protection" {
  detector_id = aws_guardduty_detector.this.id
  name        = "EBS_MALWARE_PROTECTION" # または S3_MALWARE_PROTECTION (2025年最新)
  status      = "ENABLED"
}

# Lambda Protection の有効化
resource "aws_guardduty_detector_feature" "lambda_protection" {
  detector_id = aws_guardduty_detector.this.id
  name        = "LAMBDA_NETWORK_LOGS"
  status      = "ENABLED"
}
