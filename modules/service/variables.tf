variable "key_relay_arn" {
  description = "Only this Cognito public-key helper may be invoked by the API."
  type        = string
}

variable "database_driver" {
  description = "Application database adapter: postgres, mysql or documentdb."
  type        = string
  default     = "postgres"
}

variable "worker_role_arn" {
  description = "Optional worker IAM role ARN mapped into DocumentDB; empty when events are disabled."
  type        = string
  default     = ""
}

variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "region" {
  description = "AWS region of the workload and its service endpoints."
  type        = string
}

variable "image" {
  description = "Immutable ECR image URI with @sha256 digest."
  type        = string
}

variable "ecr_arn" {
  description = "Installation ECR repository ARN used by the execution role."
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

variable "target_group_arn" {
  description = "Private ALB target group ARN used to register the API tasks."
  type        = string
}

variable "environment" {
  description = "Non-secret environment variables. Database access uses task/function IAM roles."
  type        = map(string)
}

variable "database_resource_ids" {
  description = "SQL database resource IDs allowed by rds-db:connect; empty for DocumentDB IAM mapping."
  type        = list(string)
}

variable "admin_secret_arn" {
  description = "AWS-managed administrator secret ARN; available only to the migration role."
  type        = string
}

variable "database_kms_arn" {
  description = "Secret CMK ARN for SQL; null for the AWS-managed DocumentDB secret key."
  type        = string
}

variable "queue_arn" {
  description = "Only this SQS queue may receive API messages; null disables publishing permissions."
  type        = string
}

variable "cpu" {
  description = "Fargate CPU units (1024 units = 1 vCPU). Must match memory."
  type        = number
}

variable "memory" {
  description = "Fargate task memory in MiB. Must match the selected CPU tier."
  type        = number
}

variable "replicas" {
  description = "Minimum and desired API task count when activated."
  type        = number
}

variable "max_replicas" {
  description = "Maximum API tasks allowed by CPU target tracking."
  type        = number
}

variable "autoscaling" {
  description = "CPU target and scale-in/out cooldown seconds. Replica bounds are separate."
  type        = object({ target_cpu = number, scale_in_cooldown = number, scale_out_cooldown = number })
  default     = { target_cpu = 60, scale_in_cooldown = 120, scale_out_cooldown = 60 }
  validation {
    condition     = var.autoscaling.target_cpu >= 10 && var.autoscaling.target_cpu <= 90 && alltrue([for value in [var.autoscaling.scale_in_cooldown, var.autoscaling.scale_out_cooldown] : value >= 0 && value <= 3600 && floor(value) == value])
    error_message = "Use CPU 10–90 percent and whole cooldown seconds from 0 to 3600."
  }
}

variable "active" {
  description = "Enable workloads only after the private database migration succeeds."
  type        = bool
}

variable "retention" {
  description = "CloudWatch log retention in whole days."
  type        = number
}
