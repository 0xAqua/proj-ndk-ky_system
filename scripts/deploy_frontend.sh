#!/bin/bash
#
# ./deploy_frontend.sh sandbox
# ./deploy_frontend.sh dev
#
set -e  # エラーが出たら即終了

# ─────────────────────────────
# 引数チェック
# ─────────────────────────────
if [ -z "$1" ]; then
    echo "Usage: $0 <env>"
    echo "  env: dev | sandbox"
    exit 1
fi

ENV=$1

# ─────────────────────────────
# 環境別設定
# ─────────────────────────────
case "$ENV" in
    dev)
        S3_BUCKET="ndk-ky-system-dev-frontend"
        CLOUDFRONT_DISTRIBUTION_ID="E1BDOGL14486L1"
        BUILD_MODE="dev"
        ;;
    sandbox)
        S3_BUCKET="ndk-ky-system-sandbox-frontend"
        CLOUDFRONT_DISTRIBUTION_ID="E3B1F00C3MN2SE"
        BUILD_MODE="sandbox"
        ;;
    *)
        echo "Error: Unknown environment '$ENV'"
        echo "  Available: dev | sandbox"
        exit 1
        ;;
esac

PROFILE="proj-ndk-ky"

# ─────────────────────────────
# パス設定
# ─────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# ─────────────────────────────
# 確認表示
# ─────────────────────────────
echo "=== Deploy Frontend ==="
echo "Environment: $ENV"
echo "S3 Bucket: $S3_BUCKET"
echo "CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"
echo "Build Mode: $BUILD_MODE"
echo ""

# ─────────────────────────────
# ビルド
# ─────────────────────────────
echo "=== Building React app (mode: $BUILD_MODE) ==="
cd "$APP_DIR"
npm run build:$BUILD_MODE
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
echo ""
echo "Done! 🚀"
echo "Environment: $ENV"
echo "Frontend deployed to S3: $S3_BUCKET"
echo ""