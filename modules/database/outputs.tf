output "kind" { value = var.kind }
output "driver" { value = local.driver }
output "port" { value = local.port }
output "host" {
  value = local.postgres ? aws_db_instance.this[0].address : local.aurora ? aws_rds_cluster.aurora[0].endpoint : aws_docdb_cluster.this[0].endpoint
}
output "resource_id" {
  value = local.postgres ? aws_db_instance.this[0].resource_id : local.aurora ? aws_rds_cluster.aurora[0].cluster_resource_id : aws_docdb_cluster.this[0].cluster_resource_id
}
output "admin_secret_arn" {
  value = local.postgres ? aws_db_instance.this[0].master_user_secret[0].secret_arn : local.aurora ? aws_rds_cluster.aurora[0].master_user_secret[0].secret_arn : aws_docdb_cluster.this[0].master_user_secret[0].secret_arn
}
output "kms_arn" { value = aws_kms_key.data.arn }
output "admin_secret_kms_arn" {
  description = "DocumentDB uses the AWS-managed Secrets Manager key with this provider version, not the database CMK."
  value       = local.documentdb ? null : aws_kms_key.data.arn
}
output "reader_endpoints" {
  description = "Not used by the reference app: writer reads preserve read-after-write consistency."
  value       = length(var.read_replicas) == 0 ? [] : local.postgres ? [] : [local.aurora ? aws_rds_cluster.aurora[0].reader_endpoint : aws_docdb_cluster.this[0].reader_endpoint]
}

output "connect_resource_ids" {
  value = local.postgres ? [aws_db_instance.this[0].resource_id] : local.aurora ? [aws_rds_cluster.aurora[0].cluster_resource_id] : []
}
