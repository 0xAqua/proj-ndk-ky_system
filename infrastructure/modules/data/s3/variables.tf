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

variable "force_destroy" {
  description = "バケット削除時に中身も強制削除するか"
  type        = bool
  default     = true # 開発は true, 本番は false で渡す
}
