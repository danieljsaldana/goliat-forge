variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "subnets" {
  description = "Isolated data subnet IDs in two availability zones."
  type        = list(string)
}

variable "security_group" {
  description = "Security group ID restricting this workload or database."
  type        = string
}

variable "availability_zones" {
  description = "Two distinct AZ names matching the private data subnets."
  type        = list(string)
  validation {
    condition     = length(distinct(var.availability_zones)) >= 2
    error_message = "The database module needs at least two distinct workload availability zones."
  }
}

variable "kind" {
  description = "One data engine: postgres, aurora-postgresql, aurora-mysql or documentdb."
  type        = string
  default     = "postgres"
  validation {
    condition     = contains(["postgres", "aurora-postgresql", "aurora-mysql", "documentdb"], var.kind)
    error_message = "Choose postgres, aurora-postgresql, aurora-mysql or documentdb."
  }
}

variable "instance_class" {
  description = "Writer DB instance class; null selects the profile default."
  type        = string
  default     = null
}

variable "storage_gb" {
  description = "Initial RDS PostgreSQL storage in GiB; cluster storage is managed by AWS."
  type        = number
}

variable "max_storage_gb" {
  description = "RDS storage ceiling; null uses a bounded triple allocation, or disables autoscaling when too close to 65536 GiB."
  type        = number
  default     = null
  validation {
    condition     = var.max_storage_gb == null ? true : (var.max_storage_gb == var.storage_gb || var.max_storage_gb >= ceil(var.storage_gb * 1.1)) && var.max_storage_gb <= 65536 && floor(var.max_storage_gb) == var.max_storage_gb
    error_message = "Use equal initial/max storage to disable autoscaling, or a ceiling at least 10 percent higher, up to 65536 whole GiB."
  }
}

variable "final_snapshot_identifier" {
  description = "Optional unique final snapshot name. Change it before a later teardown if the default snapshot already exists."
  type        = string
  default     = null
}

variable "multi_az" {
  description = "RDS standby, or require cluster reader compute outside the writer AZ."
  type        = bool
}

variable "protect" {
  description = "Enable deletion protection; disable explicitly before reviewed teardown."
  type        = bool
}

variable "backup_days" {
  description = "Automated database backup retention in whole days (1–35)."
  type        = number
}

variable "skip_final_snapshot" {
  description = "Explicitly skip the final database snapshot during teardown when true."
  type        = bool
}

variable "engine_version" {
  description = "Optional supported engine version. DocumentDB IAM is pinned to 5.0.0."
  type        = string
  default     = null
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
    condition     = length(var.read_replicas) <= 5 && alltrue([for key, item in var.read_replicas : key != "primary" && can(regex("^[a-z]([a-z0-9-]{0,17}[a-z0-9])?$", key)) && !strcontains(key, "--") && item.promotion_tier >= 0 && item.promotion_tier <= 15 && floor(item.promotion_tier) == item.promotion_tier])
    error_message = "Use up to five named readers (primary is reserved) and integer promotion tiers from 0 to 15."
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
