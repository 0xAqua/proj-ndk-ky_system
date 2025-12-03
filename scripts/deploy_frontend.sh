#!/bin/bash

set -e

# スクリプトの場所基準でパス解決
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# AWS CLI profile
PROFILE="proj-ndk-ky"

echo "=== Loading Terraform outputs ==="
# Terraform の出力値から自動取得
CLOUDFRONT_DISTRIBUTION_ID=$(terraform -chdir="$PROJECT_ROOT/infra/dev" output -raw frontend_cloudfront_distribution_id)
CLOUDFRONT_DOMAIN=$(terraform -chdir="$PROJECT_ROOT/infra/dev" output -raw frontend_cloudfront_domain)
S3_BUCKET=$(terraform -chdir="$PROJECT_ROOT/infra/dev" output -raw frontend_bucket_name)

echo "CloudFront ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "S3 Bucket: $S3_BUCKET"

# app をビルド
echo "=== Building frontend ==="
cd "$APP_DIR"
npm run build

echo "=== Uploading to S3 ==="
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --profile "$PROFILE"

echo "=== Invalidating CloudFront cache ==="
aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --profile "$PROFILE"

echo ""
echo "🚀 Deployment complete!"
echo "🌐 Visit: https://$CLOUDFRONT_DOMAIN"
