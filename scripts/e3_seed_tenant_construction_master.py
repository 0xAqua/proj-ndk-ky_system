#!/usr/bin/env python3
"""
Tenant Construction Master Seeder
Usage:
    python e3_seed_tenant_construction_master.py dev
    python e3_seed_tenant_construction_master.py sandbox
"""

import json
import sys
import boto3
from pathlib import Path
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# ============================================
# 環境別設定
# ============================================
ENV_CONFIG = {
    "dev": {
        "table_name": "ndk-ky-system-dev-tenant-construction-master",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/dev/e3_tenant_construction_master_seed.json",
    },
    "sandbox": {
        "table_name": "ndk-ky-system-sandbox-tenant-construction-master",
        "profile": "proj-ndk-ky",
        "region": "ap-northeast-1",
        "seed_file": "../seeds/sandbox/e3_tenant_construction_master_seed.json",
    },
}


def get_dynamodb_table(profile: str, region: str, table_name: str):
    """DynamoDB テーブルリソースを取得"""
    session = boto3.Session(profile_name=profile)
    dynamodb = session.resource("dynamodb", region_name=region)
    return dynamodb.Table(table_name)


def flatten_data(node, tenant_id, flat_list):
    """
    ネストされたJSONノードを再帰的にフラットなリストに変換する
    """
    item = {
        "tenant_id": tenant_id,
        "nodePath": node["id"],
        "title": node["title"],
    }

    # 固有属性があれば追加
    if "is_high_risk" in node:
        item["is_high_risk"] = node["is_high_risk"]

    flat_list.append(item)

    # 子要素を再帰処理
    if "children" in node:
        for child in node["children"]:
            flatten_data(child, tenant_id, flat_list)

    if "tasks" in node:
        for task in node["tasks"]:
            flatten_data(task, tenant_id, flat_list)

    if "safety_equipments" in node:
        for eq in node["safety_equipments"]:
            flatten_data(eq, tenant_id, flat_list)


def delete_tenant_data(table, tenant_id: str) -> int:
    """指定されたテナントIDのデータを全削除する"""
    print(f"テナントID: {tenant_id} の既存データを検索中...")

    try:
        response = table.query(
            KeyConditionExpression=Key("tenant_id").eq(tenant_id)
        )
    except ClientError as e:
        print(f"❌ Queryエラー: {e}")
        raise

    items = response.get("Items", [])

    if not items:
        print("削除対象のデータはありません。")
        return 0

    print(f"{len(items)} 件のデータを削除します...")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    "tenant_id": item["tenant_id"],
                    "nodePath": item["nodePath"],
                }
            )

    print("削除完了。")
    return len(items)


def import_data(table, seed_file: str) -> int:
    """シードファイルからデータをインポート"""
    seed_path = Path(seed_file)

    if not seed_path.exists():
        print(f"❌ シードファイルが見つかりません: {seed_path}")
        return 0

    print(f"[{seed_file}] を読み込み中...")

    with open(seed_path, "r", encoding="utf-8") as f:
        source_data = json.load(f)

    tenant_id = source_data["tenant_id"]
    root_nodes = source_data["data"]

    # 1. 既存データの削除
    delete_tenant_data(table, tenant_id)

    # 2. データのフラット化
    flat_items = []
    for node in root_nodes:
        flatten_data(node, tenant_id, flat_items)

    print(f"{len(flat_items)} 件のデータを登録します...")

    # 3. データの登録
    with table.batch_writer() as batch:
        for item in flat_items:
            batch.put_item(Item=item)

    print("✅ 登録完了！")
    return len(flat_items)


def main():
    # 引数チェック
    if len(sys.argv) < 2:
        print("Usage: python e3_seed_tenant_construction_master.py <env>")
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

        # データ登録
        created = import_data(table, config["seed_file"])

        # 結果表示
        print()
        print("=" * 40)
        print(f"Done! Created: {created}")

    except Exception as e:
        print(f"❌ 処理中断: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
