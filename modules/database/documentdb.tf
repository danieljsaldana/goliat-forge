resource "aws_docdb_subnet_group" "this" {
  count       = local.documentdb ? 1 : 0
  name_prefix = "${var.name}-"
  subnet_ids  = var.subnets
}
resource "aws_docdb_cluster_parameter_group" "this" {
  count       = local.documentdb ? 1 : 0
  name_prefix = "${var.name}-"
  family      = "docdb5.0"
  parameter {
    name         = "tls"
    value        = "enabled"
    apply_method = "pending-reboot"
  }
  parameter {
    name  = "audit_logs"
    value = "enabled"
  }
}
resource "aws_docdb_cluster" "this" {
  count                           = local.documentdb ? 1 : 0
  cluster_identifier              = var.name
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = "forgeadmin"
  manage_master_user_password     = true
  port                            = 27017
  db_subnet_group_name            = aws_docdb_subnet_group.this[0].name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.this[0].name
  vpc_security_group_ids          = [var.security_group]
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.data.arn
  backup_retention_period         = var.backup_days
  preferred_backup_window         = "02:00-03:00"
  preferred_maintenance_window    = "sun:03:00-sun:04:00"
  deletion_protection             = var.protect
  skip_final_snapshot             = var.skip_final_snapshot
  final_snapshot_identifier       = "${var.name}-final"
  enabled_cloudwatch_logs_exports = ["audit"]
  apply_immediately               = false
}
resource "aws_docdb_cluster_instance" "writer" {
  count                      = local.documentdb ? 1 : 0
  identifier                 = "${var.name}-primary"
  cluster_identifier         = aws_docdb_cluster.this[0].id
  instance_class             = local.instance_class
  availability_zone          = var.availability_zones[0]
  promotion_tier             = 0
  auto_minor_version_upgrade = true
}
resource "aws_docdb_cluster_instance" "reader" {
  for_each                   = local.documentdb ? var.read_replicas : {}
  identifier                 = "${var.name}-${each.key}"
  cluster_identifier         = aws_docdb_cluster.this[0].id
  instance_class             = coalesce(each.value.instance_class, local.instance_class)
  availability_zone          = coalesce(each.value.availability_zone, var.multi_az ? var.availability_zones[1] : var.availability_zones[0])
  promotion_tier             = each.value.promotion_tier
  auto_minor_version_upgrade = true
  depends_on                 = [aws_docdb_cluster_instance.writer]
}
