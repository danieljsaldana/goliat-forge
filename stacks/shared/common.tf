variable "common" {
  description = "Shared installation settings. Credentials never belong here."
  type = object({
    name   = string
    region = string
    tags = optional(map(string), {
      }
    )
    monthly_budget_usd = optional(number, 100)
    alert_emails       = optional(list(string), [])
    log_retention_days = optional(number, 30)
    }
  )
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,15}$", var.common.name)) && var.common.monthly_budget_usd > 0 && contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365], var.common.log_retention_days)
    error_message = "Use a 3–16 character lowercase name, a positive budget and a supported CloudWatch retention."
  }
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.common.region))
    error_message = "Use an AWS region such as eu-west-1. Check CloudFront VPC origin availability."
  }
}
