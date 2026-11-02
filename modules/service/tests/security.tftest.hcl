mock_provider "aws" { source = "../../tests/mocks" }
variables {
  name                  = "forge-dev"
  region                = "eu-west-1"
  image                 = "000000000000.dkr.ecr.eu-west-1.amazonaws.com/forge/api@sha256:0000000000000000000000000000000000000000000000000000000000000000"
  ecr_arn               = "arn:aws:ecr:eu-west-1:000000000000:repository/forge/api"
  subnets               = ["subnet-00000000000000001", "subnet-00000000000000002"]
  security_group        = "sg-00000000000000001"
  target_group_arn      = "arn:aws:elasticloadbalancing:eu-west-1:000000000000:targetgroup/example/0000000000000000"
  environment           = { DB_NAME = "forge" }
  database_resource_ids = ["db-EXAMPLE"]
  admin_secret_arn      = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:example-AbCdEf"
  database_kms_arn      = null
  queue_arn             = null
  key_relay_arn         = "arn:aws:lambda:eu-west-1:000000000000:function:example"
  cpu                   = 256
  memory                = 512
  replicas              = 1
  max_replicas          = 3
  active                = true
  retention             = 7
}
run "private_api_and_separate_migration_permissions" {
  command = apply
  assert {
    condition     = !aws_ecs_service.api.network_configuration[0].assign_public_ip && !aws_ecs_service.api.enable_execute_command && jsondecode(aws_ecs_task_definition.api.container_definitions)[0].readonlyRootFilesystem
    error_message = "The API must remain private and use a read-only root filesystem."
  }
  assert {
    condition     = !strcontains(aws_iam_role_policy.api.policy, "secretsmanager:GetSecretValue") && strcontains(aws_iam_role_policy.migration.policy, "secretsmanager:GetSecretValue") && jsondecode(aws_iam_role.api.assume_role_policy).Statement[0].Condition.StringEquals["aws:SourceAccount"] == "000000000000"
    error_message = "Only migration may read the admin secret; task trusts must be scoped to this account."
  }
}
run "configured_cpu_autoscaling" {
  command = apply
  variables { autoscaling = { target_cpu = 70, scale_in_cooldown = 300, scale_out_cooldown = 30 } }
  assert {
    condition     = aws_appautoscaling_policy.api[0].target_tracking_scaling_policy_configuration[0].target_value == 70 && aws_appautoscaling_policy.api[0].target_tracking_scaling_policy_configuration[0].scale_in_cooldown == 300
    error_message = "The public scaling configuration must reach target tracking."
  }
}
