import boto3
import json

def main():
    # プロファイルを指定してセッションを作成
    session = boto3.Session(profile_name="proj-ndk-ky", region_name="ap-northeast-1")

    # セッションから DynamoDB クライアントを生成
    dynamodb = session.client("dynamodb")

    table_name = "ndk-ky-dev-dynamodb-ConstructionMaster"

    # 全件取得（Scan）
    response = dynamodb.scan(TableName=table_name)

    # 結果を整形して出力
    items = response.get("Items", [])
    print(json.dumps(items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
