variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "api_gateway_domain" {
  description = "Domain name of the API Gateway (without https://)"
  type        = string
}

variable "web_acl_arn" {
  description = "ARN of the WAF Web ACL (Virginia)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate (Virginia)"
  type        = string
}

variable "alias_domain" {
  description = "Custom domain alias (e.g. api.ndk-ky.com)"
  type        = string
}