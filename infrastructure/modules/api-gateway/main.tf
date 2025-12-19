# 1. API Gateway 本体 (HTTP API)
resource "aws_apigatewayv2_api" "this" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  # CORS設定 (フロントエンドからのアクセス許可)
  cors_configuration {
    allow_origins = var.allowed_origins

    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

    allow_headers = [
      "Content-Type",
      "Authorization",
      "X-Amz-Date",
      "X-Api-Key",
      "X-Amz-Security-Token",
      "X-Requested-With",
      "tenant-id"
    ]

    allow_credentials = true

    max_age           = 300
  }
}

# 2. デプロイステージ
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    # バースト(瞬間最大): 50リクエスト
    throttling_burst_limit = 50
    # レート(秒間平均): 20リクエスト/秒
    throttling_rate_limit  = 20
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_log.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
      # マルチテナント用：認証情報
      sub            = "$context.authorizer.claims.sub"
      tenantId       = "$context.authorizer.claims.custom:tenant_id"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_access_log" {
  name              = "/aws/apigateway/${var.name_prefix}-api"
  retention_in_days = 30
}
# 3. 共通 Authorizer (Cognito JWT)
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [var.user_pool_client_id]
    issuer   = "https://cognito-idp.${var.region}.amazonaws.com/${var.user_pool_id}"
  }
}