import boto3
from boto3.dynamodb.conditions import Key
import json

def main():
    # セッション作成
    session = boto3.Session(profile_name="proj-ndk-ky", region_name="ap-northeast-1")
    dynamodb = session.resource("dynamodb")
    table = dynamodb.Table("ndk-ky-dev-dynamodb-ConstructionMaster")

    # クエリ実行：共通(DEPT#1)配下の工事工程(TYPE#)のみ取得
    response = table.query(
        KeyConditionExpression=Key("tenant_id").eq("t0001") & Key("nodePath").begins_with("DEPT#1#TYPE#")
    )

    # 結果を整形して出力
    items = response["Items"]
    print(json.dumps(items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
