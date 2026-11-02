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
