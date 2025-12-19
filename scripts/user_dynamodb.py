import boto3
import json

# ==========================================
# 設定: 診断結果からコピーした正確な値
# ==========================================
PROFILE_NAME = 'proj-ndk-ky'
REGION = 'ap-northeast-1'
TABLE_NAME = 'ndk-ky-system-dev-tenant-user-master'  # 診断結果の通り
JSON_FILE = '../seeds/tenant_user_master_seed.json'
# ==========================================

print(f"--- 処理開始: {TABLE_NAME} ---")

# 1. プロファイルを指定してセッションを作成（これが重要）
try:
    session = boto3.Session(profile_name=PROFILE_NAME)
    # セッションからリソースを作成
    dynamodb = session.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    print("✅ AWSセッション確立成功")
except Exception as e:
    print(f"❌ AWS接続エラー: {e}")
    exit(1)

def truncate_table():
    print("既存データをスキャン中...")
    try:
        # scan実行
        scan = table.scan()
    except Exception as e:
        print(f"❌ Scanエラー: {e}")
        print("考えられる原因: プロファイル設定、リージョン、テーブル名の不一致")
        raise e

    items = scan.get('Items', [])
    if not items:
        print("削除対象のデータはありません。")
        return

    print(f"{len(items)} 件のデータを削除します...")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    'tenant_id': item['tenant_id'],
                    'user_id': item['user_id']
                }
            )
    print("削除完了。")

def import_data():
    print(f"[{JSON_FILE}] を読み込み中...")
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            users = json.load(f)
    except FileNotFoundError:
        print("❌ JSONファイルが見つかりません。パスを確認してください。")
        return

    print(f"{len(users)} 件のデータを登録します...")

    with table.batch_writer() as batch:
        for user in users:
            batch.put_item(Item=user)
    print("✅ 登録完了！")

if __name__ == '__main__':
    try:
        truncate_table()
        import_data()
    except Exception as e:
        print(f"❌ 処理中断: {e}")