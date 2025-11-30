variable "name_prefix" { type = string }

# バックアップ対象を識別するためのタグ
variable "selection_tags" {
  description = "Resource tags to include in backup (e.g. { Project = ndk-ky })"
  type        = map(string)
}