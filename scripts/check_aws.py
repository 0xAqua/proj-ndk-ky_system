import boto3

# あなたが使っているプロファイル名
PROFILE = 'proj-ndk-ky'
# リージョン
REGION = 'ap-northeast-1'

print(f"--- 診断開始: プロファイル [{PROFILE}] / リージョン [{REGION}] ---")

try:
    # 1. セッションを作成
    session = boto3.Session(profile_name=PROFILE)

    # 2. 接続確認 (STS)
    sts = session.client('sts', region_name=REGION)
    identity = sts.get_caller_identity()
    print(f"✅ AWS接続成功")
    print(f"   - Account ID: {identity['Account']}")
    print(f"   - ARN:        {identity['Arn']}")

    # 3. テーブル一覧を取得 (DynamoDB)
    ddb = session.client('dynamodb', region_name=REGION)
    print("\n--- テーブル一覧を取得中... ---")
    tables = ddb.list_tables()
    table_names = tables.get('TableNames', [])

    if not table_names:
        print("❌ テーブルが1つも見つかりませんでした。")
        print("   -> アカウントまたはリージョンが間違っている可能性があります。")
    else:
        print(f"👀 {len(table_names)} 個のテーブルが見つかりました:")
        for name in table_names:
            print(f"   - {name}")

except Exception as e:
    print(f"❌ エラーが発生しました:\n{e}")
    print("\nヒント: '~/.aws/credentials' に [proj-ndk-ky] は正しく設定されていますか？")