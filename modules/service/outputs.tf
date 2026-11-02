output "cluster" {
  description = "ECS cluster name for service deployment and migration."
  value       = aws_ecs_cluster.this.name
}

output "service" {
  description = "ECS API service name."
  value       = aws_ecs_service.api.name
}

output "migration_task" {
  description = "Private administrator migration task definition ARN."
  value       = aws_ecs_task_definition.migration.arn
}
