output "bucket" {
  description = "Encrypted and versioned state bucket name."
  value       = aws_s3_bucket.state.id
}

output "kms_arn" {
  description = "State encryption key ARN for backend configuration."
  value       = aws_kms_key.state.arn
}
