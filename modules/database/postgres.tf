resource "aws_db_parameter_group" "this" {
  count       = local.postgres ? 1 : 0
  name_prefix = "${var.name}-"
  family      = "postgres${split(".", local.postgres_version)[0]}"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  lifecycle { create_before_destroy = true }
}
resource "aws_db_instance" "this" {
  count                               = local.postgres ? 1 : 0
  identifier                          = var.name
  engine                              = "postgres"
  engine_version                      = local.postgres_version
  instance_class                      = local.instance_class
  allocated_storage                   = var.storage_gb
  max_allocated_storage               = local.max_storage_gb
  storage_type                        = "gp3"
  storage_encrypted                   = true
  kms_key_id                          = aws_kms_key.data.arn
  db_name                             = "forge"
  username                            = "forge_admin"
  manage_master_user_password         = true
  master_user_secret_kms_key_id       = aws_kms_key.data.arn
  iam_database_authentication_enabled = true
  db_subnet_group_name                = aws_db_subnet_group.this[0].name
  parameter_group_name                = aws_db_parameter_group.this[0].name
  vpc_security_group_ids              = [var.security_group]
  publicly_accessible                 = false
  multi_az                            = var.multi_az
  backup_retention_period             = var.backup_days
  backup_window                       = "02:00-03:00"
  maintenance_window                  = "sun:03:00-sun:04:00"
  deletion_protection                 = var.protect
  skip_final_snapshot                 = var.skip_final_snapshot
  final_snapshot_identifier           = local.final_snapshot_identifier
  auto_minor_version_upgrade          = true
  copy_tags_to_snapshot               = true
  enabled_cloudwatch_logs_exports     = ["postgresql", "upgrade"]
  apply_immediately                   = false
}
