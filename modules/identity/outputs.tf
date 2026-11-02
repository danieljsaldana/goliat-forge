output "key_relay_arn" {
  description = "IAM-invoked Cognito public-key helper function ARN."
  value       = aws_lambda_function.keys.arn
}

output "pool_id" {
  description = "Cognito user pool ID for JWT issuer validation."
  value       = aws_cognito_user_pool.this.id
}

output "client_id" {
  description = "Public browser app client ID; this client has no secret."
  value       = aws_cognito_user_pool_client.web.id
}

output "domain_prefix" {
  description = "Managed Cognito login domain prefix."
  value       = aws_cognito_user_pool_domain.this.domain
}
