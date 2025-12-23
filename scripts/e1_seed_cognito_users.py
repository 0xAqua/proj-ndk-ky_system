#!/usr/bin/env python3
"""
Cognito User Seeder
Usage:
    python seed_cognito_users.py dev
    python seed_cognito_users.py sandbox
"""

import json
import sys
import boto3
from pathlib import Path
from botocore.exceptions import ClientError

# ============================================
# 環境別設定
# ============================================
ENV_CONFIG = {
    "dev": {
        "user_pool_id": "ap-northeast-1_xxxxxxxxx",  # ← dev の User Pool ID
        "profile": "proj-ndk-ky",
        "seed_file": "seeds/dev/e1_cognito_user_seed.json",
    },
    "sandbox": {
        "user_pool_id": "ap-northeast-1_LOVQFDLSp",  # ← sandbox の User Pool ID
        "profile": "proj-ndk-ky",
        "seed_file": "../seeds/sandbox/e1_cognito_user_seed.json",
    },
}


def get_cognito_client(profile: str):
    """Cognito クライアントを取得"""
    session = boto3.Session(profile_name=profile)
    return session.client("cognito-idp")


def get_existing_users(client, user_pool_id: str) -> set:
    """既存ユーザーのメールアドレス一覧を取得"""
    existing = set()
    paginator = client.get_paginator("list_users")

    for page in paginator.paginate(UserPoolId=user_pool_id):
        for user in page.get("Users", []):
            existing.add(user["Username"])

    return existing


def create_user(client, user_pool_id: str, email: str, password: str, tenant_id: str) -> bool:
    """ユーザーを作成してパスワードを永続化"""
    try:
        # 1. ユーザー作成
        client.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            TemporaryPassword=password,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "custom:tenant_id", "Value": tenant_id},
            ],
            MessageAction="SUPPRESS",
        )

        # 2. パスワードを永続化
        client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=email,
            Password=password,
            Permanent=True,
        )

        return True

    except ClientError as e:
        print(f"  Error: {e.response['Error']['Message']}")
        return False


def main():
    # 引数チェック
    if len(sys.argv) < 2:
        print("Usage: python seed_cognito_users.py <env>")
        print("  env: dev | sandbox")
        sys.exit(1)

    env = sys.argv[1]

    if env not in ENV_CONFIG:
        print(f"Error: Unknown environment '{env}'")
        print(f"  Available: {', '.join(ENV_CONFIG.keys())}")
        sys.exit(1)

    config = ENV_CONFIG[env]
    print(f"=== Environment: {env} ===")
    print(f"User Pool ID: {config['user_pool_id']}")
    print(f"Seed File: {config['seed_file']}")
    print()

    # シードファイル読み込み
    seed_path = Path(config["seed_file"])
    if not seed_path.exists():
        print(f"Error: Seed file not found: {seed_path}")
        sys.exit(1)

    with open(seed_path, "r", encoding="utf-8") as f:
        users = json.load(f)

    print(f"Found {len(users)} users in seed file")

    # Cognito クライアント初期化
    client = get_cognito_client(config["profile"])

    # 既存ユーザー取得
    print("Fetching existing users...")
    existing_users = get_existing_users(client, config["user_pool_id"])
    print(f"Existing users: {len(existing_users)}")
    print()

    # ユーザー作成
    created = 0
    skipped = 0
    failed = 0

    for user in users:
        email = user.get("email")
        password = user.get("password")
        tenant_id = user.get("tenant_id")

        if not email or not password or not tenant_id:
            print(f"⚠ Skipped: invalid data - {user}")
            failed += 1
            continue

        if email in existing_users:
            print(f"⏭ Skipped (exists): {email}")
            skipped += 1
            continue

        print(f"Creating: {email}...", end=" ")
        if create_user(client, config["user_pool_id"], email, password, tenant_id):
            print("✓")
            created += 1
        else:
            print("✗")
            failed += 1

    # 結果表示
    print()
    print("=" * 40)
    print(f"Done! Created: {created}, Skipped: {skipped}, Failed: {failed}")


if __name__ == "__main__":
    main()