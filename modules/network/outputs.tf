output "vpc_id" {
  description = "Workload VPC ID."
  value       = aws_vpc.this.id
}

output "app_subnets" {
  description = "Private application subnet IDs, in availability-zone order."
  value       = aws_subnet.app[*].id
}

output "data_subnets" {
  description = "Isolated database subnet IDs, in availability-zone order."
  value       = aws_subnet.data[*].id
}

output "alb_sg" {
  description = "Ingress security group for the internal ALB."
  value       = aws_security_group.alb.id
}

output "app_sg" {
  description = "Security group for API and private migration tasks."
  value       = aws_security_group.app.id
}

output "worker_sg" {
  description = "Security group for the optional event worker."
  value       = aws_security_group.worker.id
}

output "database_sg" {
  description = "Database security group, restricted to the selected port."
  value       = aws_security_group.database.id
}

output "availability_zones" {
  description = "Two workload availability zones used for stable reader placement."
  value       = local.azs
}
