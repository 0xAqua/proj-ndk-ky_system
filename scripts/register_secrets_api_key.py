import boto3
import json
from botocore.exceptions import ClientError

# ==========================================
# 設定
# ==========================================
PROFILE_NAME = 'proj-ndk-ky'
REGION = 'ap-northeast-1'
JSON_FILE = '../seeds/secrets_api_key_seed.json'
# ==========================================

print(f"--- Secrets Manager登録開始 (Profile: {PROFILE_NAME}) ---")

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
            tenants = json.load(f)
    except FileNotFoundError:
        print("❌ JSONファイルが見つかりません。パスを確認してください。")
        return

    print(f"{len(tenants)} 件のシークレットを処理します...")

    for item in tenants:
        tenant_id = item['tenant_id']
        secret_data = item['secret_data']
        description = item.get('description', '')

        # シークレット名 (命名規則: ndk-ky/dev/{tenant_id}/vq-key)
        secret_name = f"ndk-ky/dev/{tenant_id}/vq-key"
        secret_string = json.dumps(secret_data)

        print(f"処理中: {secret_name} ...")

        try:
            # 1. 作成を試みる
            client.create_secret(
                Name=secret_name,
                Description=description,
                SecretString=secret_string
            )
            print(f"  -> ✅ 新規作成しました")

        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceExistsException':
                # 2. 既にある場合は値を更新する
                try:
                    client.put_secret_value(
                        SecretId=secret_name,
                        SecretString=secret_string
                    )
                    print(f"  -> 🔄 既存のシークレットを更新しました")
                except Exception as update_error:
                    print(f"  -> ❌ 更新エラー: {update_error}")
            else:
                print(f"  -> ❌ 作成エラー: {e}")

    print("--- 処理完了 ---")

if __name__ == '__main__':
    register_secrets()