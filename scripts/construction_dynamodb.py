import boto3
import json
from boto3.dynamodb.conditions import Key

# 設定
# ユーザーマスタのテーブル名命名規則から推測（違っていれば修正してください）
TABLE_NAME = 'ndk-ky-dev-tenant-construction-master'
JSON_FILE = '../seeds/table_tenant_construction_master.json'

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

def flatten_data(node, tenant_id, flat_list):
    """
    ネストされたJSONノードを再帰的にフラットなリストに変換する
    """
    # 自分のデータをリストに追加（id -> nodePath にリネーム）
    item = {
        'tenant_id': tenant_id,
        'nodePath': node['id'],
        'title': node['title']
    }

    # 固有属性があれば追加（is_high_riskなど）
    if 'is_high_risk' in node:
        item['is_high_risk'] = node['is_high_risk']

    flat_list.append(item)

    # 子要素（children）があれば再帰処理
    if 'children' in node:
        for child in node['children']:
            flatten_data(child, tenant_id, flat_list)

    # tasks があればそれぞれ処理
    if 'tasks' in node:
        for task in node['tasks']:
            flatten_data(task, tenant_id, flat_list)

    # safety_equipments があればそれぞれ処理
    if 'safety_equipments' in node:
        for eq in node['safety_equipments']:
            # DynamoDB上で区別しやすいようType属性などを足すのもアリですが、
            # とりあえず今回はフラット化のみ行います
            flatten_data(eq, tenant_id, flat_list)

def delete_tenant_data(tenant_id):
    """
    指定されたテナントIDのデータを全削除する
    """
    print(f"テナントID: {tenant_id} の既存データを検索中...")

    # Queryを使ってテナントのデータを取得
    response = table.query(
        KeyConditionExpression=Key('tenant_id').eq(tenant_id)
    )
    items = response.get('Items', [])

    if not items:
        print("削除対象のデータはありません。")
        return

    print(f"{len(items)} 件のデータを削除します...")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    'tenant_id': item['tenant_id'],
                    'nodePath': item['nodePath']
                }
            )
    print("削除完了。")

def main():
    print(f"[{JSON_FILE}] を読み込み中...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        source_data = json.load(f)

    tenant_id = source_data['tenant_id']
    root_nodes = source_data['data']

    # 1. 既存データの削除
    delete_tenant_data(tenant_id)

    # 2. データのフラット化
    flat_items = []
    for node in root_nodes:
        flatten_data(node, tenant_id, flat_items)

    print(f"{len(flat_items)} 件のデータを登録します...")

    # 3. データの登録
    with table.batch_writer() as batch:
        for item in flat_items:
            batch.put_item(Item=item)

    print("登録完了！")

if __name__ == '__main__':
    main()