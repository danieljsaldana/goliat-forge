output "vpc_id" {
  description = "Workload VPC ID."
  value       = aws_vpc.this.id
  # CloudFront checks for an attached gateway when creating its VPC origin.
  depends_on = [aws_internet_gateway.this]
}

output "app_subnets" {
  description = "Private application subnet IDs, in availability-zone order."
  value       = aws_subnet.app[*].id
  # Workloads need usable private routes and endpoints, not just subnet IDs.
  depends_on = [
    aws_route_table_association.app,
    aws_vpc_endpoint.interface,
    aws_vpc_endpoint.s3,
    aws_route.nat,
    aws_route.public,
    aws_route_table_association.public,
  ]
}

output "data_subnets" {
  description = "Isolated database subnet IDs, in availability-zone order."
  value       = aws_subnet.data[*].id
  depends_on  = [aws_route_table_association.data]
}

output "alb_sg" {
  description = "Ingress security group for the internal ALB."
  value       = aws_security_group.alb.id
  depends_on  = [aws_vpc_security_group_ingress_rule.alb, aws_vpc_security_group_egress_rule.alb]
}

output "app_sg" {
  description = "Security group for API and private migration tasks."
  value       = aws_security_group.app.id
  depends_on = [
    aws_vpc_security_group_ingress_rule.app,
    aws_vpc_security_group_egress_rule.database,
    aws_vpc_security_group_egress_rule.endpoints,
    aws_vpc_security_group_egress_rule.s3,
    aws_vpc_security_group_egress_rule.nat,
  ]
}

output "worker_sg" {
  description = "Security group for the optional event worker."
  value       = aws_security_group.worker.id
  depends_on  = [aws_vpc_security_group_egress_rule.database, aws_vpc_security_group_egress_rule.endpoints]
}

output "database_sg" {
  description = "Database security group, restricted to the selected port."
  value       = aws_security_group.database.id
  depends_on  = [aws_vpc_security_group_ingress_rule.database]
}

output "availability_zones" {
  description = "Two workload availability zones used for stable reader placement."
  value       = local.azs
}
