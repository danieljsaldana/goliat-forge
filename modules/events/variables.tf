variable "database_driver" {
  description = "Application database adapter: postgres, mysql or documentdb."
  type        = string
  default     = "postgres"
}

variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "region" {
  description = "AWS region of the workload and its service endpoints."
  type        = string
}

variable "archive" {
  description = "Absolute path to the locally packaged, versioned Lambda source archive."
  type        = string
}

variable "subnets" {
  description = "Private workload subnet IDs in two availability zones."
  type        = list(string)
}

variable "security_group" {
  description = "Security group ID restricting this workload or database."
  type        = string
}

variable "database_resource_ids" {
  description = "SQL database resource IDs allowed by rds-db:connect; empty for DocumentDB IAM mapping."
  type        = list(string)
}

variable "environment" {
  description = "Non-secret environment variables. Database access uses task/function IAM roles."
  type        = map(string)
}

variable "retention" {
  description = "CloudWatch log retention in whole days."
  type        = number
}

variable "active" {
  description = "Enable workloads only after the private database migration succeeds."
  type        = bool
}

variable "settings" {
  description = "Bounded worker, queue, retry and recovery settings; SQS visibility is derived as six times worker timeout."
  type = object({
    worker_memory_mb   = optional(number, 256)
    worker_timeout     = optional(number, 30)
    max_concurrency    = optional(number, 2)
    batch_size         = optional(number, 5)
    max_receive_count  = optional(number, 5)
    retention_days     = optional(number, 7)
    dlq_retention_days = optional(number, 14)
    recovery_minutes   = optional(number, 5)
  })
  default = {}
  validation {
    condition     = var.settings.worker_memory_mb >= 128 && var.settings.worker_memory_mb <= 10240 && var.settings.worker_timeout >= 1 && var.settings.worker_timeout <= 900 && var.settings.max_concurrency >= 2 && var.settings.max_concurrency <= 50 && var.settings.batch_size >= 1 && var.settings.batch_size <= 10 && var.settings.max_receive_count >= 1 && var.settings.max_receive_count <= 100 && var.settings.retention_days >= 1 && var.settings.retention_days <= 14 && var.settings.dlq_retention_days >= var.settings.retention_days && var.settings.dlq_retention_days <= 14 && var.settings.recovery_minutes >= 1 && var.settings.recovery_minutes <= 60 && alltrue([for value in values(var.settings) : floor(value) == value])
    error_message = "Invalid worker/queue settings: use the bounds documented in the public auto.tfvars templates."
  }
}
