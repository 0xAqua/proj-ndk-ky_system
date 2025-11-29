# 1. API Gateway 本体 (HTTP API)
resource "aws_apigatewayv2_api" "this" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  # CORS設定 (フロントエンドからのアクセス許可)
  cors_configuration {
    allow_origins = ["*"] # 本番時は "https://example.com" 等に制限推奨
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
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