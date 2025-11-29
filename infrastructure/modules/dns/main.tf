variable "root_domain_name" { type = string }

resource "aws_route53_zone" "this" {
  name = var.root_domain_name
}

output "zone_id" { value = aws_route53_zone.this.zone_id }
output "nameservers" { value = aws_route53_zone.this.name_servers }