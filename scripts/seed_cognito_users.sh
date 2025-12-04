#!/bin/bash

# 設定
USER_POOL_ID=$(terraform -chdir=../infrastructure/environments/dev output -raw auth_user_pool_id)
PROFILE="proj-ndk-ky"
SEED_FILE="../seeds/cognito_user_seed.json"

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
    USERNAME=$(jq -r ".[$i].username" "$SEED_FILE")
    PASSWORD=$(jq -r ".[$i].password" "$SEED_FILE")
    EMAIL=$(jq -r ".[$i].attributes.email" "$SEED_FILE")
    GIVEN_NAME=$(jq -r ".[$i].attributes.given_name" "$SEED_FILE")
    FAMILY_NAME=$(jq -r ".[$i].attributes.family_name" "$SEED_FILE")
    TENANT_ID=$(jq -r ".[$i].attributes[\"custom:tenant_id\"]" "$SEED_FILE")

    # 既存ユーザーかチェック
    if echo "$EXISTING_USERS" | grep -q "^${USERNAME}$"; then
        echo "⏭ Skipped (exists): $USERNAME"
        ((SKIPPED++))
        continue
    fi

    echo "Creating user: $USERNAME"

    # ユーザー作成
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
        # パスワードを永続的に設定
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "$USERNAME" \
            --password "$PASSWORD" \
            --permanent \
            --profile "$PROFILE"

        echo "✓ Created: $USERNAME"
        ((CREATED++))
    else
        echo "✗ Failed: $USERNAME"
    fi
done

echo ""
echo "Done! Created: $CREATED, Skipped: $SKIPPED"