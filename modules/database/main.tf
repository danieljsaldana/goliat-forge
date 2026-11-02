variable "name" { type = string }
variable "subnets" { type = list(string) }
variable "security_group" { type = string }
variable "availability_zones" {
  type = list(string)
  validation {
    condition     = length(distinct(var.availability_zones)) >= 2
    error_message = "The database module needs at least two distinct workload availability zones."
  }
}
variable "kind" {
  type    = string
  default = "postgres"
  validation {
    condition     = contains(["postgres", "aurora-postgresql", "aurora-mysql", "documentdb"], var.kind)
    error_message = "Choose postgres, aurora-postgresql, aurora-mysql or documentdb."
  }
}
variable "instance_class" {
  type    = string
  default = null
}
variable "storage_gb" { type = number }
variable "multi_az" { type = bool }
variable "protect" { type = bool }
variable "backup_days" { type = number }
variable "skip_final_snapshot" { type = bool }
variable "engine_version" {
  type    = string
  default = null
  validation {
    condition     = var.kind != "documentdb" || var.engine_version == null || var.engine_version == "5.0.0"
    error_message = "DocumentDB IAM identity authentication requires instance-based 5.0.0; other versions are not enabled in this product."
  }
}
variable "read_replicas" {
  description = "Stable reader names, optional instance classes, and cluster failover priorities (0–15)."
  type        = map(object({ instance_class = optional(string), promotion_tier = optional(number, 1), availability_zone = optional(string) }))
  default     = {}
  validation {
    condition     = length(var.read_replicas) <= 5 && alltrue([for key, item in var.read_replicas : can(regex("^[a-z][a-z0-9-]{0,18}$", key)) && item.promotion_tier >= 0 && item.promotion_tier <= 15 && floor(item.promotion_tier) == item.promotion_tier])
    error_message = "Use up to five named readers and integer promotion tiers from 0 to 15."
  }
  validation {
    condition     = alltrue([for item in var.read_replicas : item.availability_zone == null ? true : contains(var.availability_zones, item.availability_zone)])
    error_message = "Reader availability zones must belong to the environment data subnets."
  }
  validation {
    condition     = var.kind != "postgres" || length(var.read_replicas) == 0
    error_message = "RDS PostgreSQL cannot create read replicas from an AWS-managed master-secret source. Keep Multi-AZ for standby HA or choose Aurora PostgreSQL for readers."
  }
  validation {
    condition     = !var.multi_az || var.kind == "postgres" || anytrue([for item in var.read_replicas : item.availability_zone == null ? true : item.availability_zone != var.availability_zones[0]])
    error_message = "Multi-AZ Aurora/DocumentDB compute requires at least one reader; storage redundancy alone does not add failover compute."
  }
}
locals {
  postgres         = var.kind == "postgres"
  aurora           = startswith(var.kind, "aurora-")
  documentdb       = var.kind == "documentdb"
  port             = var.kind == "aurora-mysql" ? 3306 : var.kind == "documentdb" ? 27017 : 5432
  driver           = var.kind == "aurora-mysql" ? "mysql" : var.kind == "documentdb" ? "documentdb" : "postgres"
  instance_class   = coalesce(var.instance_class, local.postgres ? "db.t4g.small" : "db.r6g.large")
  postgres_version = coalesce(var.engine_version, "17")
  aurora_family    = var.kind == "aurora-mysql" ? "aurora-mysql${var.engine_version == null ? "8.4" : substr(var.engine_version, 0, 3)}" : "aurora-postgresql${var.engine_version == null ? "17" : split(".", var.engine_version)[0]}"
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
