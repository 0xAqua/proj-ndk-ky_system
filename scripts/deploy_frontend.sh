#!/bin/bash

set -e

# スクリプトの場所基準でパス解決
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# AWS CLI profile
PROFILE="proj-ndk-ky"

# Terraform ディレクトリ
TF_DIR="$PROJECT_ROOT/infrastructure/environments/dev"

echo "=== Loading Terraform outputs ==="

CLOUDFRONT_DISTRIBUTION_ID=$(terraform -chdir="$TF_DIR" output -raw frontend_cloudfront_distribution_id)
CLOUDFRONT_DOMAIN=$(terraform -chdir="$TF_DIR" output -raw frontend_cloudfront_domain)
S3_BUCKET=$(terraform -chdir="$TF_DIR" output -raw frontend_bucket_name)

echo "CloudFront ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "S3 Bucket: $S3_BUCKET"

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
