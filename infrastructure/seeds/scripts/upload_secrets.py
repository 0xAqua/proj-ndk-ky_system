import boto3
import json
import os

# 設定
REGION = "ap-northeast-1"
PROFILE = "proj-ndk-ky" # AWS CLIのプロファイル名
PROJECT_PREFIX = "ndk-ky/dev/vq-key" # secrets-managerモジュールで作ったプレフィックス
JSON_FILE = "secrets_seed.json"

def upload_secrets():
    # セッション作成
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    client = session.client("secretsmanager")

    # JSON読み込み
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            secrets_map = json.load(f)
    except FileNotFoundError:
        print(f"Error: {JSON_FILE} が見つかりません。")
        return

    print(f"--- Uploading secrets to {PROJECT_PREFIX}/... ---")

    for tenant_id, api_key in secrets_map.items():
        secret_name = f"{PROJECT_PREFIX}/{tenant_id}"
        secret_string = json.dumps({"api_key": api_key})

        print(f"Processing: {secret_name}")

        try:
            # 作成を試みる
            client.create_secret(
                Name=secret_name,
                Description=f"VQ API Key for {tenant_id}",
                SecretString=secret_string
            )
            print(f"✅ Created: {secret_name}")

        except client.exceptions.ResourceExistsException:
            # 既に存在する場合は値を更新する
            print(f"⚠️ Exists. Updating value...")
            client.put_secret_value(
                SecretId=secret_name,
                SecretString=secret_string
            )
            print(f"✅ Updated: {secret_name}")

        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    upload_secrets()