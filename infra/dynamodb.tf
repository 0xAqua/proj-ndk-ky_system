# -----------------------------------------------------------------
# DynamoDB ConstructionMaster 定義
# -----------------------------------------------------------------
resource "aws_dynamodb_table" "construction_master" {
  name         = "ndk-ky-dev-dynamodb-ConstructionMaster"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "tenant_id"
  range_key = "nodePath"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "nodePath"
    type = "S"
  }

  tags = {
    Name        = "ndk-ky-dev-dynamodb-ConstructionMaster"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}
