import boto3
import os
import json

dynamodb = boto3.client("dynamodb")
TABLE_NAME = os.environ.get("TABLE_NAME")

def lambda_handler(event, context):
    params = event.get("queryStringParameters") or {}
    tenant_id = params.get("t")
    prefix = params.get("p")

    if not tenant_id or not prefix:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing query params t or p"})
        }

    response = dynamodb.query(
        TableName=TABLE_NAME,
        KeyConditionExpression="tenant_id = :t and begins_with(nodePath, :p)",
        ExpressionAttributeValues={
            ":t": {"S": tenant_id},
            ":p": {"S": prefix}
        }
    )

    items = [
        {k: list(v.values())[0] for k, v in item.items()}
        for item in response.get("Items", [])
    ]

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(items, ensure_ascii=False)
    }
