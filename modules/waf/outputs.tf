output "arn" {
  description = "Shared global Web ACL ARN associated with environment CloudFront distributions."
  value       = aws_wafv2_web_acl.shared.arn
}
