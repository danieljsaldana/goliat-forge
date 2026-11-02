mock_provider "aws" { source = "../../tests/mocks" }
variables {
  name      = "forge-dev"
  url       = "https://example.cloudfront.net"
  archive   = "../../.forge/test-fixtures/worker.zip"
  retention = 7
  mfa       = true
}
run "protected_pool_and_public_client" {
  command = apply
  assert {
    condition     = aws_cognito_user_pool.this.deletion_protection == "ACTIVE" && aws_cognito_user_pool.this.mfa_configuration == "ON" && !aws_cognito_user_pool_client.web.generate_secret && aws_cognito_user_pool.this.admin_create_user_config[0].allow_admin_create_user_only
    error_message = "Protect identity data and require administrator-provisioned users, MFA and a secret-free browser client."
  }
}
run "explicit_reviewed_teardown" {
  command = apply
  variables { protect = false }
  assert {
    condition     = aws_cognito_user_pool.this.deletion_protection == "INACTIVE"
    error_message = "The environment teardown override must also release Cognito deletion protection."
  }
}
