variable "environment" {
  description = "An isolated workload environment. See environments/dev.tfvars and prod.tfvars."
  type = object({
    name              = string
    vpc_cidr          = string
    endpoint_az_count = optional(number, 2)
    nat_enabled       = optional(bool, false)
    cpu               = optional(number, 256)
    memory            = optional(number, 512)
    replicas          = optional(number, 1)
    max_replicas      = optional(number, 3)
    autoscaling = optional(object({
      target_cpu         = optional(number, 60)
      scale_in_cooldown  = optional(number, 120)
      scale_out_cooldown = optional(number, 60)
    }), {})
    db_kind                      = optional(string, "postgres")
    db_read_replicas             = optional(map(object({ instance_class = optional(string), promotion_tier = optional(number, 1), availability_zone = optional(string) })), {})
    db_instance_class            = optional(string)
    db_engine_version            = optional(string)
    db_storage_gb                = optional(number, 20)
    db_max_storage_gb            = optional(number)
    db_final_snapshot_identifier = optional(string)
    db_multi_az                  = optional(bool, false)
    db_backup_days               = optional(number, 7)
    deletion_protection          = optional(bool, true)
    skip_final_snapshot          = optional(bool, false)
    events_enabled               = optional(bool, false)
    events = optional(object({
      worker_memory_mb   = optional(number, 256)
      worker_timeout     = optional(number, 30)
      max_concurrency    = optional(number, 2)
      batch_size         = optional(number, 5)
      max_receive_count  = optional(number, 5)
      retention_days     = optional(number, 7)
      dlq_retention_days = optional(number, 14)
      recovery_minutes   = optional(number, 5)
    }), {})
    mfa_required    = optional(bool, false)
    domain_name     = optional(string)
    certificate_arn = optional(string)
    portals = optional(map(object({
      label = string
      view  = string
      })), {
      tenant = { label = "Request portal", view = "requester" }
      admin  = { label = "Operations portal", view = "operator" }
    })
  })
  validation {
    condition     = contains(["postgres", "aurora-postgresql", "aurora-mysql", "documentdb"], var.environment.db_kind)
    error_message = "Choose a supported db_kind: postgres, aurora-postgresql, aurora-mysql or documentdb."
  }
  validation {
    condition     = var.environment.db_kind != "documentdb" || var.environment.db_engine_version == null || var.environment.db_engine_version == "5.0.0"
    error_message = "The DocumentDB profile uses 5.0.0 for IAM identity authentication."
  }
  validation {
    condition     = var.environment.db_kind != "aurora-mysql" || var.environment.db_engine_version == null || can(regex("^8[.](0|4)[.]mysql_aurora[.]", var.environment.db_engine_version))
    error_message = "Aurora MySQL requires its full 8.0/8.4 AWS engine version, or null for a supported regional 8.4 release."
  }
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,6}[a-z0-9]$", var.environment.name)) && !strcontains(var.environment.name, "--") && try(cidrhost(var.environment.vpc_cidr, 0) == split("/", var.environment.vpc_cidr)[0] && tonumber(split("/", var.environment.vpc_cidr)[1]) >= 16 && tonumber(split("/", var.environment.vpc_cidr)[1]) <= 19 && can(regex("^(10[.]|172[.](1[6-9]|2[0-9]|3[01])[.]|192[.]168[.])", cidrhost(var.environment.vpc_cidr, 0))), false)
    error_message = "Use a 2–8 character lowercase environment name and a canonical RFC1918 IPv4 CIDR between /16 and /19 for this subnet layout."
  }
  validation {
    condition     = contains([1, 2], var.environment.endpoint_az_count) && var.environment.replicas >= 1 && floor(var.environment.replicas) == var.environment.replicas && var.environment.max_replicas >= var.environment.replicas && floor(var.environment.max_replicas) == var.environment.max_replicas && var.environment.db_backup_days >= 1 && var.environment.db_backup_days <= 35 && floor(var.environment.db_backup_days) == var.environment.db_backup_days && var.environment.db_storage_gb >= 20 && var.environment.db_storage_gb <= 65536 && floor(var.environment.db_storage_gb) == var.environment.db_storage_gb
    error_message = "Choose 1 or 2 endpoint AZs, integer replica limits, 1–35 whole backup days and 20–65536 whole GiB."
  }
  validation {
    condition = contains(lookup({
      "256"  = [512, 1024, 2048], "512" = range(1024, 4097, 1024), "1024" = range(2048, 8193, 1024),
      "2048" = range(4096, 16385, 1024), "4096" = range(8192, 30721, 1024),
      "8192" = range(16384, 61441, 4096), "16384" = range(32768, 122881, 8192)
    }, tostring(var.environment.cpu), []), var.environment.memory)
    error_message = "Use a supported Linux ARM64 Fargate CPU/memory pair from 256 to 16384 CPU units; see the configuration guide."
  }
  validation {
    condition     = var.environment.autoscaling.target_cpu >= 10 && var.environment.autoscaling.target_cpu <= 90 && alltrue([for value in [var.environment.autoscaling.scale_in_cooldown, var.environment.autoscaling.scale_out_cooldown] : value >= 0 && value <= 3600 && floor(value) == value])
    error_message = "Set target CPU to 10–90 percent and whole cooldown seconds from 0 to 3600."
  }
  validation {
    condition     = var.environment.events.worker_memory_mb >= 128 && var.environment.events.worker_memory_mb <= 10240 && var.environment.events.worker_timeout >= 1 && var.environment.events.worker_timeout <= 900 && var.environment.events.max_concurrency >= 2 && var.environment.events.max_concurrency <= 50 && var.environment.events.batch_size >= 1 && var.environment.events.batch_size <= 10 && var.environment.events.max_receive_count >= 1 && var.environment.events.max_receive_count <= 100 && var.environment.events.retention_days >= 1 && var.environment.events.retention_days <= 14 && var.environment.events.dlq_retention_days >= var.environment.events.retention_days && var.environment.events.dlq_retention_days <= 14 && var.environment.events.recovery_minutes >= 1 && var.environment.events.recovery_minutes <= 60 && alltrue([for value in values(var.environment.events) : floor(value) == value])
    error_message = "Use integer event options: memory 128–10240 MiB, timeout 1–900s, concurrency 2–50, batch 1–10, attempts 1–100, retention 1–14 days (DLQ >= source) and recovery 1–60 minutes."
  }
  validation {
    condition     = var.environment.db_max_storage_gb == null ? true : (var.environment.db_max_storage_gb == var.environment.db_storage_gb || var.environment.db_max_storage_gb >= ceil(var.environment.db_storage_gb * 1.1)) && var.environment.db_max_storage_gb <= 65536 && floor(var.environment.db_max_storage_gb) == var.environment.db_max_storage_gb
    error_message = "RDS max storage must equal initial storage to disable autoscaling, or be at least 10 percent higher, up to 65536 whole GiB. Null selects the bounded default."
  }
  validation {
    condition     = var.environment.db_final_snapshot_identifier == null ? true : can(regex("^[a-zA-Z][a-zA-Z0-9-]{0,253}[a-zA-Z0-9]$", var.environment.db_final_snapshot_identifier)) && !strcontains(var.environment.db_final_snapshot_identifier, "--")
    error_message = "Use a 2–255 character final snapshot identifier starting with a letter, without consecutive or trailing hyphens."
  }
  validation {
    condition     = length(var.environment.portals) > 0 && alltrue([for k, v in var.environment.portals : can(regex("^[a-z][a-z0-9-]{1,20}$", k)) && !contains(["api", "callback", "config"], k) && contains(["requester", "operator"], v.view) && length(v.label) > 0])
    error_message = "Each portal needs a path key, label and requester/operator view; api, callback and config are reserved."
  }
  validation {
    condition     = (var.environment.domain_name == null) == (var.environment.certificate_arn == null)
    error_message = "Configure a custom domain and its ACM us-east-1 certificate together, or leave both null."
  }
  validation {
    condition     = var.environment.domain_name == null ? true : length(var.environment.domain_name) <= 253 && can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.environment.domain_name)) && can(regex("^arn:aws:acm:us-east-1:[0-9]{12}:certificate/[a-f0-9-]{36}$", var.environment.certificate_arn))
    error_message = "Use a lowercase DNS hostname (no scheme, path or wildcard) and an ACM certificate ARN in us-east-1."
  }
  validation {
    condition     = var.environment.name != "prod" || (var.environment.domain_name != null && var.environment.certificate_arn != null)
    error_message = "Production requires a custom domain and its ACM us-east-1 certificate. Dev/demo may use the generated hostname."
  }
}

variable "platform" {
  description = "Non-secret outputs of stacks/shared; the CLI writes them locally."
  type = object({
    name = string, region = string, ecr_url = string, ecr_arn = string, waf_arn = string
    }
  )
  validation {
    condition     = var.platform.name == var.common.name && var.platform.region == var.common.region
    error_message = "The shared outputs must belong to this installation and region."
  }
}

variable "api_image" {
  description = "An immutable API image digest in this installation's ECR repository."
  type        = string
  validation {
    condition     = can(regex("^[0-9]{12}\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com/.+@sha256:[a-f0-9]{64}$", var.api_image))
    error_message = "Publish to ECR and use the immutable @sha256 digest."
  }
  validation {
    condition     = startswith(var.api_image, "${var.platform.ecr_url}@sha256:")
    error_message = "The image must belong to this installation ECR repository."
  }
}

variable "worker_archive" {
  description = "Locally built Lambda archive; generated artifacts never belong in Git."
  type        = string
}

variable "activate_workloads" {
  description = "The CLI activates the API, autoscaling and event processing after the first database migration."
  type        = bool
  default     = false
}

variable "frontend_script_hashes" {
  description = "Exact SHA-256 CSP hashes derived from the Next.js static export by scripts/build_frontend.py."
  type        = list(string)
  default     = []
  validation {
    condition     = alltrue([for hash in var.frontend_script_hashes : can(regex("^sha256-[A-Za-z0-9+/]{43}=$", hash))])
    error_message = "Use SHA-256 base64 CSP hashes generated from the frontend build."
  }
}
