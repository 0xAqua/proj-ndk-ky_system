#!/bin/bash

# スクリプトのディレクトリを基準にパスを解決
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
BUILD_DIR="$APP_DIR/dist"

# 設定
S3_BUCKET="ndk-ky-system-dev-frontend"
CLOUDFRONT_DISTRIBUTION_ID="E2RLJ8GKQ0AK1V"
PROFILE="proj-ndk-ky"

# appディレクトリに移動してビルド
echo "Building React app..."
cd "$APP_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo "✗ Build failed"
    exit 1
fi

# S3にアップロード（既存ファイルを同期・削除）
echo "Uploading to S3..."
aws s3 sync "$BUILD_DIR" "s3://$S3_BUCKET" \
    --delete \
    --profile "$PROFILE"

if [ $? -eq 0 ]; then
    echo "✓ Upload complete"
else
    echo "✗ Upload failed"
    exit 1
fi

# CloudFrontキャッシュ無効化
if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "YOUR_DISTRIBUTION_ID" ]; then
    echo "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --paths "/*" \
        --profile "$PROFILE"
    echo "✓ Cache invalidation started"
fi

echo ""
echo "Done! Site: https://d35yoc6m1omzc3.cloudfront.net"