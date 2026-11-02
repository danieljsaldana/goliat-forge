locals {
  default_storage_ceiling   = min(var.storage_gb * 3, 65536)
  max_storage_gb            = var.max_storage_gb == null ? (local.default_storage_ceiling >= ceil(var.storage_gb * 1.1) ? local.default_storage_ceiling : var.storage_gb) : var.max_storage_gb
  postgres                  = var.kind == "postgres"
  aurora                    = startswith(var.kind, "aurora-")
  documentdb                = var.kind == "documentdb"
  port                      = var.kind == "aurora-mysql" ? 3306 : var.kind == "documentdb" ? 27017 : 5432
  driver                    = var.kind == "aurora-mysql" ? "mysql" : var.kind == "documentdb" ? "documentdb" : "postgres"
  instance_class            = coalesce(var.instance_class, local.postgres ? "db.t4g.small" : "db.r6g.large")
  postgres_version          = coalesce(var.engine_version, "17")
  aurora_family             = var.kind == "aurora-mysql" ? "aurora-mysql${var.engine_version == null ? "8.4" : substr(var.engine_version, 0, 3)}" : "aurora-postgresql${var.engine_version == null ? "17" : split(".", var.engine_version)[0]}"
  final_snapshot_identifier = coalesce(var.final_snapshot_identifier, "${var.name}-final")
}
resource "aws_kms_key" "data" {
  description             = "${var.name} database encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}
resource "aws_db_subnet_group" "this" {
  count       = local.documentdb ? 0 : 1
  name_prefix = "${var.name}-"
  subnet_ids  = var.subnets
}
# Preserve the original PostgreSQL addresses when adopting the selectable module.
moved {
  from = aws_db_subnet_group.this
  to   = aws_db_subnet_group.this[0]
}
moved {
  from = aws_db_parameter_group.this
  to   = aws_db_parameter_group.this[0]
}
moved {
  from = aws_db_instance.this
  to   = aws_db_instance.this[0]
}
