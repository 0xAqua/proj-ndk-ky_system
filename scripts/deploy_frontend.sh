#!/bin/bash

set -e

# ─────────────────────────────
# パス設定
# ─────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# ─────────────────────────────
# 設定
# ─────────────────────────────
S3_BUCKET="ndk-ky-system-dev-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E2RLJ8GKQ0AK1V"
CLOUDFRONT_DOMAIN="d35yoc6m1omzc3.cloudfront.net"
PROFILE="proj-ndk-ky"

# ─────────────────────────────
# ビルド
# ─────────────────────────────
echo "=== Building React app ==="
cd "$APP_DIR"
rm -rf dist
npm run build
echo "✓ Build complete"

# ─────────────────────────────
# S3 を完全に空にしてからアップロード
# ─────────────────────────────
echo "=== Clearing S3 bucket ==="
aws s3 rm "s3://$S3_BUCKET" --recursive --profile "$PROFILE"
echo "✓ S3 cleared"

echo "=== Uploading to S3 ($S3_BUCKET) ==="
aws s3 cp "$BUILD_DIR" "s3://$S3_BUCKET" \
    --recursive \
    --profile "$PROFILE" \
    --cache-control "no-cache, no-store, must-revalidate"
echo "✓ Upload complete"

# ─────────────────────────────
# CloudFront Invalidation（完了まで待つ）
# ─────────────────────────────
echo "=== Invalidating CloudFront cache ==="
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --profile "$PROFILE" \
    --query "Invalidation.Id" \
    --output text)

echo "Invalidation started: $INVALIDATION_ID"
echo "Waiting for completion... (1-2 min)"

aws cloudfront wait invalidation-completed \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID" \
    --profile "$PROFILE"

echo "✓ Cache invalidation completed"

# ─────────────────────────────
# 完了表示
# ─────────────────────────────
echo ""
echo "Done!  🚀"
echo "Frontend deployed to:"
echo "👉 https://${CLOUDFRONT_DOMAIN}"
echo ""