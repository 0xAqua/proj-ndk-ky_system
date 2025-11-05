# -----------------------------------------------------------------
# API Gateway (ダミー定義・将来拡張用)
# -----------------------------------------------------------------
resource "aws_apigatewayv2_api" "construction_api" {
  name          = "ndk-ky-dev-construction-api"
  protocol_type = "HTTP"

  tags = {
    Name        = "ndk-ky-dev-construction-api"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.construction_api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name        = "ndk-ky-dev-apigateway-stage"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

output "api_url" {
  value = aws_apigatewayv2_api.construction_api.api_endpoint
}
