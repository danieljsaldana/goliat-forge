output "url" {
  description = "Public HTTPS application origin."
  value       = "https://${coalesce(var.domain_name, aws_cloudfront_distribution.web.domain_name)}"
}

output "bucket" {
  description = "Private frontend bucket name for source publication."
  value       = aws_s3_bucket.web.id
}

output "distribution_id" {
  description = "CloudFront distribution ID used for asset invalidations."
  value       = aws_cloudfront_distribution.web.id
}

output "target_group_arn" {
  description = "Private API target group ARN for Fargate registration."
  value       = aws_lb_target_group.api.arn
}

output "listener_arn" {
  description = "ALB listener ARN and service startup dependency."
  value       = aws_lb_listener.api.arn
}
