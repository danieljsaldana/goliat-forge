mock_provider "aws" {

  source = "../../tests/mocks"

}

variables {
  name              = "forge-dev"
  region            = "eu-west-1"
  cidr              = "10.40.0.0/16"
  endpoint_az_count = 1
  nat_enabled       = false
  retention         = 7

}

run "private_network" {
  command = apply
  assert {
    condition     = alltrue([for subnet in aws_subnet.app : !subnet.map_public_ip_on_launch]) && alltrue([for subnet in aws_subnet.data : !subnet.map_public_ip_on_launch])
    error_message = "Workload and data subnets must not assign public IPs."

  }

  assert {
    condition     = length(aws_nat_gateway.this) == 0 && length(aws_route.nat) == 0
    error_message = "Default network must have no Internet egress route."

  }

  assert {
    condition     = aws_vpc_security_group_ingress_rule.app.referenced_security_group_id == aws_security_group.alb.id
    error_message = "Only the ALB security group may enter the API."

  }

  assert {
    condition     = length(aws_vpc_endpoint.interface) == 5
    error_message = "Private service access includes ECR, logs, secrets and Lambda invocation; SQS is optional."

  }

  assert {
    condition = try(
      jsondecode(aws_iam_role.flow.assume_role_policy).Statement[0].Condition.StringEquals["aws:SourceAccount"] == data.aws_caller_identity.current.account_id &&
      jsondecode(aws_iam_role.flow.assume_role_policy).Statement[0].Condition.ArnLike["aws:SourceArn"] == "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:vpc-flow-log/*",
      false
    )
    error_message = "Flow-log role assumption must be restricted to this account and regional flow logs."
  }

  assert {
    condition = anytrue([for statement in jsondecode(aws_iam_role_policy.flow.policy).Statement : try(
      statement.Action == "logs:DescribeLogGroups" && statement.Resource == "*" && statement.Condition.StringEquals["aws:RequestedRegion"] == var.region,
      false
    )])
    error_message = "DescribeLogGroups needs a separate wildcard-resource statement restricted to the workload region."
  }

  assert {
    condition = alltrue([for statement in jsondecode(aws_iam_role_policy.flow.policy).Statement :
      try(statement.Action == "logs:DescribeLogGroups", false) || try(
        contains(statement.Action, "logs:CreateLogGroup") && contains(statement.Action, "logs:CreateLogStream") && contains(statement.Action, "logs:PutLogEvents") &&
        alltrue([for resource in statement.Resource : startswith(resource, aws_cloudwatch_log_group.flow.arn)]),
        false
      )
    ])
    error_message = "Flow-log creation and writes must remain scoped to the environment log group."
  }


}

run "reject_vpc_larger_than_aws_limit" {
  command = plan
  variables { cidr = "10.0.0.0/8" }
  expect_failures = [var.cidr]
}
run "reject_noncanonical_or_public_range" {
  command = plan
  variables { cidr = "203.0.0.0/16" }
  expect_failures = [var.cidr]
}
