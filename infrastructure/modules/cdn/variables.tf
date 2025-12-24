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
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate (Virginia)"
  type        = string
}

variable "origin_verify_secret" {
  description = "Secret value to verify CloudFront origin"
  type        = string
  sensitive   = true
}


variable "alias_domains" {
  description = "Custom domain aliases for CloudFront"
  type        = list(string)
}
