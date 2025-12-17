# modules/data/dynamodb/tenant_master.tf

resource "aws_dynamodb_table" "tenant_master" {
  name         = "${var.project}-${var.environment}-tenant-master"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  tags = {
    Name         = "${var.project}-${var.environment}-tenant-master"
    Project      = var.project
    Environment  = var.environment
    BackupTarget = "True"
  }
}