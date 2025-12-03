#!/bin/bash

set -e

# === Terraform ディレクトリ設定 ===
TF_DIR="/Users/tsuji/NDIS/Projects/NDK/proj-ndk-ky_system/infrastructure/environments/dev"

# === プロジェクト構造から app/ を検出 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

PROFILE="proj-ndk-ky"

echo "=== Loading Terraform outputs ==="
S3_BUCKET=$(terraform -chdir="$TF_DIR" output -raw frontend_bucket_name)
CF_DIST_ID=$(terraform -chdir="$TF_DIR" output -raw frontend_cloudfront_distribution_id)
CF_DOMAIN=$(terraform -chdir="$TF_DIR" output -raw frontend_cloudfront_domain)

echo "S3_BUCKET = $S3_BUCKET"
echo "CF_DIST_ID = $CF_DIST_ID"
echo "CF_DOMAIN = $CF_DOMAIN"

echo ""
echo "=== Building React app ==="
cd "$APP_DIR"
npm run build

echo ""
echo "=== Uploading to S3 ==="
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --profile "$PROFILE"

echo ""
echo "=== Invalidating CloudFront ==="
aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" \
    --profile "$PROFILE"

echo ""
echo "=== Done! ==="
echo "Site URL: https://$CF_DOMAIN"
