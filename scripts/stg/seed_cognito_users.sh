#!/bin/bash

# 設定
USER_POOL_ID=$(terraform -chdir=../infrastructure/environments/dev output -raw auth_user_pool_id)
PROFILE="proj-ndk-ky"
SEED_FILE="/Users/tsuji/NDIS/Projects/NDK/proj-ndk-ky_system/seeds/stg/cognito_user_seed.json"

# jqがインストールされているか確認
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required. Install with: brew install jq"
    exit 1
fi

# JSONファイルの存在確認
if [ ! -f "$SEED_FILE" ]; then
    echo "Error: $SEED_FILE not found"
    exit 1
fi

# 既存ユーザー一覧を取得
echo "Fetching existing users..."
EXISTING_USERS=$(aws cognito-idp list-users \
    --user-pool-id "$USER_POOL_ID" \
    --profile "$PROFILE" \
    --query 'Users[].Username' \
    --output text | tr '\t' '\n')

# ユーザー数を取得
USER_COUNT=$(jq length "$SEED_FILE")
echo "Processing $USER_COUNT users from seed file..."

CREATED=0
SKIPPED=0

# 各ユーザーを作成
for i in $(seq 0 $((USER_COUNT - 1))); do
    EMAIL=$(jq -r ".[$i].email" "$SEED_FILE")
    PASSWORD=$(jq -r ".[$i].password" "$SEED_FILE")
    TENANT_ID=$(jq -r ".[$i].tenant_id" "$SEED_FILE")

    # 既存ユーザーかチェック（emailがusername）
    if echo "$EXISTING_USERS" | grep -q "^${EMAIL}$"; then
        echo "⏭ Skipped (exists): $EMAIL"
        ((SKIPPED++))
        continue
    fi

    echo "Creating user: $EMAIL"

    # ユーザー作成（emailのみ）
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --temporary-password "$PASSWORD" \
        --user-attributes \
            Name=email,Value="$EMAIL" \
            Name=email_verified,Value=true \
            Name=custom:tenant_id,Value="$TENANT_ID" \
        --message-action SUPPRESS \
        --profile "$PROFILE"

    if [ $? -eq 0 ]; then
        # パスワードを永続的に設定
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "$EMAIL" \
            --password "$PASSWORD" \
            --permanent \
            --profile "$PROFILE"

        echo "✓ Created: $EMAIL"
        ((CREATED++))
    else
        echo "✗ Failed: $EMAIL"
    fi
done

echo ""
echo "Done! Created: $CREATED, Skipped: $SKIPPED"