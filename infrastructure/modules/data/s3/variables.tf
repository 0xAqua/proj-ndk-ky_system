variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, stg, prod)"
  type        = string
}

variable "suffix" {
  description = "Bucket name suffix (e.g., -v2) to avoid name collision"
  type        = string
  default     = ""
}