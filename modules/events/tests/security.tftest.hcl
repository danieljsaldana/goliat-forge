mock_provider "aws" { source = "../../tests/mocks" }
variables {
  name                  = "forge-dev"
  region                = "eu-west-1"
  archive               = "../../.forge/test-fixtures/worker.zip"
  subnets               = ["subnet-00000000000000001", "subnet-00000000000000002"]
  security_group        = "sg-00000000000000001"
  database_resource_ids = ["db-EXAMPLE"]
  environment           = { DB_NAME = "forge", DB_HOST = "database.example.invalid" }
  retention             = 7
  active                = false
}
run "inactive_until_migration_and_tls_queues" {
  command = apply
  assert {
    condition     = !aws_lambda_event_source_mapping.requests.enabled && aws_cloudwatch_event_rule.recovery.state == "DISABLED" && length(aws_lambda_function.worker.vpc_config[0].subnet_ids) == 2
    error_message = "The private worker must remain inactive before migration."
  }
  assert {
    condition     = jsondecode(aws_sqs_queue_policy.dlq.policy).Statement[0].Condition.Bool["aws:SecureTransport"] == "false" && jsondecode(aws_sqs_queue_policy.requests.policy).Statement[0].Effect == "Deny"
    error_message = "Both queues must reject plaintext API access."
  }
}
run "configured_worker_and_safe_delivery_timing" {
  command = apply
  variables {
    active   = true
    settings = { worker_timeout = 60, worker_memory_mb = 512, max_concurrency = 4, batch_size = 8, recovery_minutes = 1, max_receive_count = 8 }
  }
  assert {
    condition     = aws_sqs_queue.requests.visibility_timeout_seconds == 360 && aws_lambda_function.worker.reserved_concurrent_executions == 5 && aws_lambda_event_source_mapping.requests.scaling_config[0].maximum_concurrency == 4 && aws_cloudwatch_event_rule.recovery.schedule_expression == "rate(1 minute)"
    error_message = "Timeout, visibility, queue concurrency and recovery must remain consistent when configured."
  }
}
run "reject_shorter_dlq_retention" {
  command = plan
  variables { settings = { retention_days = 14, dlq_retention_days = 1 } }
  expect_failures = [var.settings]
}
