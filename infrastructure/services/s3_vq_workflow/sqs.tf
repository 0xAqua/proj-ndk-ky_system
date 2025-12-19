# ─────────────────────────────
# 1. Dead Letter Queue (DLQ)
# ─────────────────────────────
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name_prefix}-vq-job-dlq"
  message_retention_seconds = 1209600
}

# ─────────────────────────────
# 2. Main Queue
# ─────────────────────────────
resource "aws_sqs_queue" "main" {
  name                      = "${var.name_prefix}-vq-job-queue"

  # Producerがメッセージを入れても、Workerには20秒間見えなくなります
  delay_seconds = 20

  # Worker Lambdaのタイムアウト
  visibility_timeout_seconds = 70

  # リトライ設定: 3回失敗したらDLQへ送る
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

# 3. SQS間の転送権限
resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns   = [aws_sqs_queue.main.arn]
  })
}