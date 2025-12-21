#!/bin/bash

set -e  # エラーが出たら即終了（安全）

# ─────────────────────────────
# パス設定
# ─────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# ─────────────────────────────
# 設定（必要ならここだけ変えればOK）
# ─────────────────────────────
S3_BUCKET="ndk-ky-system-dev-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E1BDOGL14486L1"
PROFILE="proj-ndk-ky"

# ─────────────────────────────
# ビルド
# ─────────────────────────────
echo "=== Building React app ==="
cd "$APP_DIR"
npm run build
echo "✓ Build complete"

# ─────────────────────────────
# S3 Upload
# ─────────────────────────────
echo "=== Uploading to S3 ($S3_BUCKET) ==="
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --profile "$PROFILE"
echo "✓ Upload complete"

# ─────────────────────────────
# CloudFront Invalidation
# ─────────────────────────────
echo "=== Invalidating CloudFront cache ==="
aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --profile "$PROFILE"
echo "✓ Cache invalidation started"

# ─────────────────────────────
# 完了表示
# ─────────────────────────────
CLOUDFRONT_DOMAIN="${CLOUDFRONT_DISTRIBUTION_ID}.cloudfront.net"
echo ""
echo "Done!  🚀"
echo "Frontend deployed to:"
echo "👉 https://${CLOUDFRONT_DOMAIN}"
echo ""
