import boto3
import json
import os

# 設定
REGION = "ap-northeast-1"
PROFILE = "proj-ndk-ky"
USER_POOL_ID = "ap-northeast-1_VYRzAWYI0"
JSON_FILE = "../cognito_user_seed.json"

def create_users():
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    client = session.client("cognito-idp")

    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            users = json.load(f)
    except FileNotFoundError:
        print(f"Error: {JSON_FILE} が見つかりません。")
        return

    print(f"--- Creating users in Pool: {USER_POOL_ID} ---")

    for user in users:
        username = user["username"]
        password = user["password"]
        attrs = user["attributes"]

        # 属性リストの形式に変換
        user_attributes = [{"Name": k, "Value": v} for k, v in attrs.items()]

        print(f"Processing: {username}")

        try:
            # 1. ユーザー作成
            client.admin_create_user(
                UserPoolId=USER_POOL_ID,
                Username=username,
                UserAttributes=user_attributes,
                MessageAction="SUPPRESS" # メールを送らない
            )
            print(f"  - Created user.")

            # 2. パスワード設定 (ステータスをCONFIRMEDにする)
            client.admin_set_user_password(
                UserPoolId=USER_POOL_ID,
                Username=username,
                Password=password,
                Permanent=True # 次回変更不要にする
            )
            print(f"  - Password set (Permanent).")
            print(f"✅ Success: {username}")

        except client.exceptions.UsernameExistsException:
            print(f"⚠️  Skipped: User already exists.")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_users()