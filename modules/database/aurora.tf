# Resolve a supported regional minor release within a fixed parameter family.
# Pin engine_version after evaluation when you need a fully controlled upgrade.
data "aws_rds_engine_version" "aurora" {
  count                  = local.aurora ? 1 : 0
  engine                 = var.kind
  parameter_group_family = local.aurora_family
  version                = var.engine_version
  latest                 = var.engine_version == null
}
resource "aws_rds_cluster_parameter_group" "aurora" {
  count       = local.aurora ? 1 : 0
  name_prefix = "${var.name}-"
  family      = data.aws_rds_engine_version.aurora[0].parameter_group_family
  parameter {
    name         = var.kind == "aurora-mysql" ? "require_secure_transport" : "rds.force_ssl"
    value        = var.kind == "aurora-mysql" ? "ON" : "1"
    apply_method = "pending-reboot"
  }
  lifecycle { create_before_destroy = true }
}
resource "aws_rds_cluster" "aurora" {
  count                               = local.aurora ? 1 : 0
  cluster_identifier                  = var.name
  engine                              = var.kind
  engine_mode                         = "provisioned"
  engine_version                      = data.aws_rds_engine_version.aurora[0].version
  database_name                       = "forge"
  master_username                     = "forge_admin"
  manage_master_user_password         = true
  master_user_secret_kms_key_id       = aws_kms_key.data.arn
  iam_database_authentication_enabled = true
  port                                = local.port
  db_subnet_group_name                = aws_db_subnet_group.this[0].name
  db_cluster_parameter_group_name     = aws_rds_cluster_parameter_group.aurora[0].name
  vpc_security_group_ids              = [var.security_group]
  storage_encrypted                   = true
  kms_key_id                          = aws_kms_key.data.arn
  backup_retention_period             = var.backup_days
  preferred_backup_window             = "02:00-03:00"
  preferred_maintenance_window        = "sun:03:00-sun:04:00"
  deletion_protection                 = var.protect
  skip_final_snapshot                 = var.skip_final_snapshot
  final_snapshot_identifier           = local.final_snapshot_identifier
  copy_tags_to_snapshot               = true
  enabled_cloudwatch_logs_exports     = var.kind == "aurora-mysql" ? ["error"] : ["postgresql"]
  apply_immediately                   = false
}
resource "aws_rds_cluster_instance" "writer" {
  count                      = local.aurora ? 1 : 0
  identifier                 = "${var.name}-primary"
  cluster_identifier         = aws_rds_cluster.aurora[0].id
  instance_class             = local.instance_class
  engine                     = var.kind
  engine_version             = aws_rds_cluster.aurora[0].engine_version
  db_subnet_group_name       = aws_db_subnet_group.this[0].name
  availability_zone          = var.availability_zones[0]
  promotion_tier             = 0
  publicly_accessible        = false
  auto_minor_version_upgrade = true
}
resource "aws_rds_cluster_instance" "reader" {
  for_each                   = local.aurora ? var.read_replicas : {}
  identifier                 = "${var.name}-${each.key}"
  cluster_identifier         = aws_rds_cluster.aurora[0].id
  instance_class             = coalesce(each.value.instance_class, local.instance_class)
  engine                     = var.kind
  engine_version             = aws_rds_cluster.aurora[0].engine_version
  db_subnet_group_name       = aws_db_subnet_group.this[0].name
  availability_zone          = coalesce(each.value.availability_zone, var.multi_az ? var.availability_zones[1] : var.availability_zones[0])
  promotion_tier             = each.value.promotion_tier
  publicly_accessible        = false
  auto_minor_version_upgrade = true
  depends_on                 = [aws_rds_cluster_instance.writer]
}
