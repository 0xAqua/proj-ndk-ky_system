output "sender_email" {
  description = "Verified sender email address"
  value       = var.domain_name == "" ? aws_ses_email_identity.sender[0].email : var.sender_email
}

output "sender_email_arn" {
  description = "ARN of the verified sender email"
  value       = var.domain_name == "" ? aws_ses_email_identity.sender[0].arn : null
}

output "configuration_set_name" {
  description = "SES configuration set name"
  value       = aws_ses_configuration_set.this.name
}

output "ses_send_policy_arn" {
  description = "IAM policy ARN for sending emails via SES"
  value       = aws_iam_policy.ses_send.arn
}

output "domain_identity_arn" {
  description = "ARN of the domain identity (if configured)"
  value       = var.domain_name != "" ? aws_ses_domain_identity.this[0].arn : null
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS configuration (if domain configured)"
  value       = var.domain_name != "" ? aws_ses_domain_dkim.this[0].dkim_tokens : []
}