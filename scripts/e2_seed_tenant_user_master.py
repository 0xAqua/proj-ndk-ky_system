#!/usr/bin/env python3
"""
Tenant User Master Seeder
Usage:
    python e2_seed_tenant_user_master.py dev
    python e2_seed_tenant_user_master.py sandbox
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
        "table_name": "ndk-ky-system-dev-tenant-user-master",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/dev/e2_tenant_user_master_seed.json",
    },
    "sandbox": {
        "table_name": "ndk-ky-system-sandbox-tenant-user-master",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/sandbox/e2_tenant_user_master_seed.json",
    },
}


def get_dynamodb_table(profile: str, region: str, table_name: str):
    """DynamoDB テーブルリソースを取得"""
    session = boto3.Session(profile_name=profile)
    dynamodb = session.resource("dynamodb", region_name=region)
    return dynamodb.Table(table_name)


def truncate_table(table):
    """テーブルの全データを削除"""
    print("既存データをスキャン中...")

    try:
        scan = table.scan()
    except ClientError as e:
        print(f"❌ Scanエラー: {e}")
        raise

    items = scan.get("Items", [])
    if not items:
        print("削除対象のデータはありません。")
        return 0

    print(f"{len(items)} 件のデータを削除します...")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    "tenant_id": item["tenant_id"],
                    "email": item["email"],  # ← user_id から email に変更
                }
            )

    print("削除完了。")
    return len(items)


def import_data(table, seed_file: str):
    """シードファイルからデータをインポート"""
    seed_path = Path(seed_file)

    if not seed_path.exists():
        print(f"❌ シードファイルが見つかりません: {seed_path}")
        return 0

    print(f"[{seed_file}] を読み込み中...")

    with open(seed_path, "r", encoding="utf-8") as f:
        users = json.load(f)

    print(f"{len(users)} 件のデータを登録します...")

    with table.batch_writer() as batch:
        for user in users:
            batch.put_item(Item=user)

    print("✅ 登録完了！")
    return len(users)


def main():
    # 引数チェック
    if len(sys.argv) < 2:
        print("Usage: python e2_seed_tenant_user_master.py <env>")
        print("  env: dev | sandbox")
        sys.exit(1)

    env = sys.argv[1]

    if env not in ENV_CONFIG:
        print(f"Error: Unknown environment '{env}'")
        print(f"  Available: {', '.join(ENV_CONFIG.keys())}")
        sys.exit(1)

    config = ENV_CONFIG[env]

    print(f"=== Environment: {env} ===")
    print(f"Table: {config['table_name']}")
    print(f"Seed File: {config['seed_file']}")
    print()

    try:
        # DynamoDB テーブル取得
        table = get_dynamodb_table(
            config["profile"],
            config["region"],
            config["table_name"],
        )
        print("✅ AWSセッション確立成功")
        print()

        # 既存データ削除
        deleted = truncate_table(table)

        # 新規データ登録
        created = import_data(table, config["seed_file"])

        # 結果表示
        print()
        print("=" * 40)
        print(f"Done! Deleted: {deleted}, Created: {created}")

    except Exception as e:
        print(f"❌ 処理中断: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()