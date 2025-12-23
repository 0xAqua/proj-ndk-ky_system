#!/usr/bin/env python3
"""
Secrets Manager API Key Seeder
Usage:
    python e4_seed_secrets_api_key.py dev
    python e4_seed_secrets_api_key.py sandbox
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
        "secret_name": "ndk-ky-system-dev/vq-credentials",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/dev/e4_secrets_api_key_seed.json",
    },
    "sandbox": {
        "secret_name": "ndk-ky-system-sandbox/vq-credentials",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/sandbox/e4_secrets_api_key_seed.json",
    },
}


def get_secrets_client(profile: str, region: str):
    """Secrets Manager クライアントを取得"""
    session = boto3.Session(profile_name=profile)
    return session.client("secretsmanager", region_name=region)


def register_secrets(client, secret_name: str, seed_file: str) -> bool:
    """シークレットを登録"""
    seed_path = Path(seed_file)

    if not seed_path.exists():
        print(f"❌ シードファイルが見つかりません: {seed_path}")
        return False

    print(f"[{seed_file}] を読み込み中...")

    with open(seed_path, "r", encoding="utf-8") as f:
        tenants = json.load(f)

    # テナントリスト全体を1つのJSON文字列にする
    secret_string = json.dumps(tenants, ensure_ascii=False)

    print(f"ターゲット: {secret_name}")
    print(f"データ件数: {len(tenants)} 件のテナント設定をまとめて更新します...")

    try:
        client.put_secret_value(
            SecretId=secret_name,
            SecretString=secret_string,
        )
        print("✅ 更新成功: シークレットに全テナントの設定を保存しました")
        return True

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            print(f"❌ エラー: シークレット '{secret_name}' が見つかりません。")
            print("   Terraformで作成されているか確認してください。")
        else:
            print(f"❌ AWSエラー: {e}")
        return False


def main():
    # 引数チェック
    if len(sys.argv) < 2:
        print("Usage: python e4_seed_secrets_api_key.py <env>")
        print("  env: dev | sandbox")
        sys.exit(1)

    env = sys.argv[1]

    if env not in ENV_CONFIG:
        print(f"Error: Unknown environment '{env}'")
        print(f"  Available: {', '.join(ENV_CONFIG.keys())}")
        sys.exit(1)

    config = ENV_CONFIG[env]

    print(f"=== Environment: {env} ===")
    print(f"Secret: {config['secret_name']}")
    print(f"Seed File: {config['seed_file']}")
    print()

    try:
        # Secrets Manager クライアント取得
        client = get_secrets_client(config["profile"], config["region"])
        print("✅ AWSセッション確立成功")
        print()

        # シークレット登録
        success = register_secrets(client, config["secret_name"], config["seed_file"])

        # 結果表示
        print()
        print("=" * 40)
        print(f"Done! {'Success' if success else 'Failed'}")

    except Exception as e:
        print(f"❌ 処理中断: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()