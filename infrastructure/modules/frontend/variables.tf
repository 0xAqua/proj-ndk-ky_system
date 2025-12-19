variable "name_prefix" {
  type = string
}

variable "alias_domain" {
  type    = string
  default = ""
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "web_acl_arn" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "api_endpoint" {
  description = "Allowed API endpoint for CSP"
  type        = string
  default     = ""
}
