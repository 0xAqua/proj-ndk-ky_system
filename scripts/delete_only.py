import boto3
from boto3.dynamodb.conditions import Key

# ==========================================
# 設定
# ==========================================
PROFILE_NAME = 'proj-ndk-ky'
REGION = 'ap-northeast-1'
TABLE_NAME = 'ndk-ky-system-dev-tenant-construction-master'
TENANT_ID = 'tenant-a'  # 削除したいテナントID
# ==========================================

print(f"--- テナント {TENANT_ID} のデータ削除開始 ---")

# セッション初期化
session = boto3.Session(profile_name=PROFILE_NAME)
dynamodb = session.resource('dynamodb', region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

# データ削除
print(f"テナントID: {TENANT_ID} の既存データを検索中...")

response = table.query(
    KeyConditionExpression=Key('tenant_id').eq(TENANT_ID)
)

items = response.get('Items', [])

if not items:
    print("❌ 削除対象のデータはありません。")
else:
    print(f"✅ {len(items)} 件のデータを削除します...")

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    'tenant_id': item['tenant_id'],
                    'nodePath': item['nodePath']
                }
            )
    print("✅ 削除完了！")