# API本体
resource "aws_apigatewayv2_api" "this" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token", "X-Requested-With", "tenant-id"]
    allow_credentials = true
    max_age           = 300 # などの注釈は消してください
  }
}

# 認証設定
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

# ステージ設定
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_log.arn
    format          = jsonencode({ requestId = "$context.requestId", status = "$context.status" }) # 簡略化
  }

  default_route_settings {
    # 開発中のため、制限を大幅に緩和します
    throttling_burst_limit = 500  # 50 -> 500
    throttling_rate_limit  = 100  # 20 -> 100
  }
}

resource "aws_cloudwatch_log_group" "api_access_log" {
  name              = "/aws/apigateway/${var.name_prefix}-api"
  retention_in_days = 30
}