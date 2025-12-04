import boto3
import json
from botocore.exceptions import ClientError

# ==========================================
# 設定
# ==========================================
PROFILE_NAME = 'proj-ndk-ky'
REGION = 'ap-northeast-1'
JSON_FILE = '../seeds/secrets_api_key_seed.json'

# ★重要: Terraformで作成したシークレット名に合わせてください
# 以前のログによると "ndk-ky-system-dev/vq-credentials" でした
TARGET_SECRET_NAME = 'ndk-ky-system-dev/vq-credentials'
# ==========================================

print(f"--- Secrets Manager一括登録 (Profile: {PROFILE_NAME}) ---")

try:
    session = boto3.Session(profile_name=PROFILE_NAME)
    client = session.client('secretsmanager', region_name=REGION)
    print("✅ AWSセッション確立成功")
except Exception as e:
    print(f"❌ AWS接続エラー: {e}")
    exit(1)

def register_secrets():
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            tenants = json.load(f) # リストとして読み込む
    except FileNotFoundError:
        print("❌ JSONファイルが見つかりません。")
        return

    # テナントリスト全体を1つのJSON文字列にする
    secret_string = json.dumps(tenants, ensure_ascii=False)

    print(f"ターゲット: {TARGET_SECRET_NAME}")
    print(f"データ件数: {len(tenants)} 件のテナント設定をまとめて更新します...")

    try:
        # 既存のシークレットの「値」を上書き更新する
        client.put_secret_value(
            SecretId=TARGET_SECRET_NAME,
            SecretString=secret_string
        )
        print(f"  -> ✅ 更新成功: シークレットに全テナントの設定を保存しました")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            print(f"  -> ❌ エラー: シークレット '{TARGET_SECRET_NAME}' が見つかりません。Terraformで作成されているか確認してください。")
        else:
            print(f"  -> ❌ AWSエラー: {e}")

    print("--- 処理完了 ---")

if __name__ == '__main__':
    register_secrets()