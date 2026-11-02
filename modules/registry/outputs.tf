output "url" {
  description = "Shared ECR repository URI; append an immutable digest for deployment."
  value       = aws_ecr_repository.api.repository_url
}

output "arn" {
  description = "Shared ECR repository ARN for scoped pull permissions."
  value       = aws_ecr_repository.api.arn
}
