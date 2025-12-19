variable "name_prefix" { type = string }
variable "user_pool_client_id" { type = string }
variable "user_pool_id" { type = string }
variable "region" { type = string }
variable "allowed_origins" {
  description = "CORSを許可するオリジンのリスト"
  type        = list(string)
}
variable "throttling_burst_limit" {
  description = "API Gatewayのバースト制限"
  type        = number
  default     = 50
}

variable "throttling_rate_limit" {
  description = "API Gatewayのレート制限 (req/sec)"
  type        = number
  default     = 20
}

