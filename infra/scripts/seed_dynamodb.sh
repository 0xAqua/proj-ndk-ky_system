#!/bin/bash
set -e

# shellcheck disable=SC2034
TABLE_NAME="ndk-ky-dev-dynamodb-ConstructionMaster"
PROFILE="proj-ndk-ky"
REGION="ap-northeast-1"

echo "=== DynamoDB 初期データ投入を開始します ==="
aws dynamodb batch-write-item \
  --request-items file://../data/ConstructionMaster.json \
  --region $REGION \
  --profile $PROFILE
echo "=== 完了しました！ ==="
