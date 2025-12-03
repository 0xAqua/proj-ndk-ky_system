#!/bin/bash

# 設定
USER_POOL_ID="ap-northeast-1_VYRzAWYI0"
PROFILE="proj-ndk-ky"
SEED_FILE="cognito_user_seed.json"

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

# ユーザー数を取得
USER_COUNT=$(jq length "$SEED_FILE")
echo "Creating $USER_COUNT users..."

# 各ユーザーを作成
for i in $(seq 0 $((USER_COUNT - 1))); do
    USERNAME=$(jq -r ".[$i].username" "$SEED_FILE")
    PASSWORD=$(jq -r ".[$i].password" "$SEED_FILE")
    EMAIL=$(jq -r ".[$i].attributes.email" "$SEED_FILE")
    GIVEN_NAME=$(jq -r ".[$i].attributes.given_name" "$SEED_FILE")
    FAMILY_NAME=$(jq -r ".[$i].attributes.family_name" "$SEED_FILE")
    TENANT_ID=$(jq -r ".[$i].attributes[\"custom:tenant_id\"]" "$SEED_FILE")

    echo "Creating user: $USERNAME"

    # ユーザー作成（temporary-password付き）
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$USERNAME" \
        --temporary-password "$PASSWORD" \
        --user-attributes \
            Name=email,Value="$EMAIL" \
            Name=email_verified,Value=true \
            Name=given_name,Value="$GIVEN_NAME" \
            Name=family_name,Value="$FAMILY_NAME" \
            Name=custom:tenant_id,Value="$TENANT_ID" \
        --message-action SUPPRESS \
        --profile "$PROFILE"

    if [ $? -eq 0 ]; then
        # パスワードを永続的に設定（FORCE_CHANGE_PASSWORD状態を解除）
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "$USERNAME" \
            --password "$PASSWORD" \
            --permanent \
            --profile "$PROFILE"

        echo "✓ Created: $USERNAME"
    else
        echo "✗ Failed: $USERNAME"
    fi
done

echo "Done!"