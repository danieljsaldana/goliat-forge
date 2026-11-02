variable "environment" {
  description = "An isolated workload environment. See environments/dev.tfvars and prod.tfvars."
  type = object({
    name                = string
    vpc_cidr            = string
    endpoint_az_count   = optional(number, 2)
    nat_enabled         = optional(bool, false)
    cpu                 = optional(number, 256)
    memory              = optional(number, 512)
    replicas            = optional(number, 1)
    max_replicas        = optional(number, 3)
    db_kind             = optional(string, "postgres")
    db_read_replicas    = optional(map(object({ instance_class = optional(string), promotion_tier = optional(number, 1), availability_zone = optional(string) })), {})
    db_instance_class   = optional(string)
    db_engine_version   = optional(string)
    db_storage_gb       = optional(number, 20)
    db_multi_az         = optional(bool, false)
    db_backup_days      = optional(number, 7)
    deletion_protection = optional(bool, true)
    skip_final_snapshot = optional(bool, false)
    events_enabled      = optional(bool, false)
    mfa_required        = optional(bool, false)
    domain_name         = optional(string)
    certificate_arn     = optional(string)
    portals = optional(map(object({
      label = string, view = string
      }
      )), {
      tenant = {
        label = "Request portal", view = "requester"
      },
      admin = {
        label = "Operations portal", view = "operator"
      }
      }
    )
    }
  )
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
    condition     = can(regex("^[a-z][a-z0-9-]{1,7}$", var.environment.name)) && can(cidrnetmask(var.environment.vpc_cidr)) && can(cidrsubnet(var.environment.vpc_cidr, 8, 21)) && tonumber(split("/", var.environment.vpc_cidr)[1]) <= 19
    error_message = "Use a 2–8 character lowercase environment name and an IPv4 CIDR with prefix 19 or shorter."
  }
  validation {
    condition     = contains([1, 2], var.environment.endpoint_az_count) && var.environment.replicas >= 1 && floor(var.environment.replicas) == var.environment.replicas && var.environment.max_replicas >= var.environment.replicas && floor(var.environment.max_replicas) == var.environment.max_replicas && var.environment.db_backup_days >= 1 && var.environment.db_backup_days <= 35 && var.environment.db_storage_gb >= 20
    error_message = "Choose 1 or 2 endpoint AZs, integer replica limits, 1–35 backup days and at least 20 GiB."
  }
  validation {
    condition = contains(lookup({
      "256" = [512, 1024, 2048], "512" = [1024, 2048, 3072, 4096], "1024" = [2048, 3072, 4096, 5120, 6144, 7168, 8192]
    }, tostring(var.environment.cpu), []), var.environment.memory)
    error_message = "Use a supported Fargate CPU/memory pair (256, 512 or 1024 CPU units)."
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
