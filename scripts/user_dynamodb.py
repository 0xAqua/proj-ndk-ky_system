import boto3
import json

# 設定：テーブル名
TABLE_NAME = 'ndk-ky-dev-tenant-user-master'
JSON_FILE = '../seeds/tenant_user_master_seed.json'

# DynamoDBリソースの初期化
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

def truncate_table():
    """テーブルの全データを削除する"""
    print(f"[{TABLE_NAME}] 既存データをスキャン中...")

    # 全件スキャン（データ量が多い場合は注意が必要ですが、マスタならこれでOK）
    scan = table.scan()
    items = scan.get('Items', [])

    if not items:
        print("削除対象のデータはありません。")
        return

    print(f"{len(items)} 件のデータを削除します...")

    # batch_writerを使って効率的に削除
    with table.batch_writer() as batch:
        for item in items:
            # プライマリキーを指定して削除（今回のキー構成に合わせて調整）
            # ここでは tenant_id と user_id が複合キー（PK/SK）と想定
            batch.delete_item(
                Key={
                    'tenant_id': item['tenant_id'],
                    'user_id': item['user_id']
                }
            )
    print("削除完了。")

def import_data():
    """JSONデータをインポートする"""
    print(f"[{JSON_FILE}] データを読み込み中...")

    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        users = json.load(f)

    print(f"{len(users)} 件のデータを登録します...")

    # batch_writerを使って効率的にPut
    with table.batch_writer() as batch:
        for user in users:
            # Boto3が自動的にPythonの辞書型をDynamoDB JSON形式に変換してくれます
            batch.put_item(Item=user)

    print("登録完了！")

if __name__ == '__main__':
    # 実行
    try:
        truncate_table()
        import_data()
    except Exception as e:
        print(f"エラーが発生しました: {e}")