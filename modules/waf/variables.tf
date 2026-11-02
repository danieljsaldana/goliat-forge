variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "retention" {
  description = "CloudWatch log retention in whole days."
  type        = number
}

variable "rate_limit" {
  description = "Shared per-IP request limit over the explicit five-minute evaluation window."
  type        = number
  default     = 1000
  validation {
    condition     = var.rate_limit >= 10 && var.rate_limit <= 100000 && floor(var.rate_limit) == var.rate_limit
    error_message = "Use a whole per-IP limit from 10 to 100000."
  }
}
