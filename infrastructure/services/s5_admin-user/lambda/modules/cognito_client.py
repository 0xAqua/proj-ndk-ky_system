import os
import boto3

# Cognito クライアント
cognito = boto3.client("cognito-idp")
USER_POOL_ID = os.environ.get("USER_POOL_ID")

# DynamoDB
dynamodb = boto3.resource("dynamodb")
TENANT_MASTER_TABLE = os.environ.get("TENANT_MASTER_TABLE")
TENANT_USER_MASTER_TABLE = os.environ.get("TENANT_USER_MASTER_TABLE")

tenant_master_table = dynamodb.Table(TENANT_MASTER_TABLE) if TENANT_MASTER_TABLE else None
tenant_user_master_table = dynamodb.Table(TENANT_USER_MASTER_TABLE) if TENANT_USER_MASTER_TABLE else None