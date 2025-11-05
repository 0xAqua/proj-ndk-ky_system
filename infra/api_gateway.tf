resource "aws_apigatewayv2_api" "construction_api" {
  name          = "ndk-ky-dev-construction-api"
  protocol_type = "HTTP"

  tags = {
    Name        = "ndk-ky-dev-construction-api"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.construction_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.query_construction.invoke_arn
  integration_method = "POST"

  tags = {
    Name        = "ndk-ky-dev-lambda-integration"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

resource "aws_apigatewayv2_route" "get_construction" {
  api_id    = aws_apigatewayv2_api.construction_api.id
  route_key = "GET /construction"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"

  tags = {
    Name        = "ndk-ky-dev-construction-route"
    Environment = "dev"
    CostID      = "NDK-KI"
  }
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.query_construction.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.construction_api.execution_arn}/*/*"
}

output "api_url" {
  value = "${aws_apigatewayv2_api.construction_api.api_endpoint}/construction"
}
