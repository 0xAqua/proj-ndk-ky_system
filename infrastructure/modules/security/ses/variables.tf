variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "sender_email" {
  description = "Sender email address (must be verified in SES)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for SES (optional, for production)"
  type        = string
  default     = ""
}

variable "zone_id" {
  description = "Route53 zone ID for DNS verification (optional)"
  type        = string
  default     = ""
}
