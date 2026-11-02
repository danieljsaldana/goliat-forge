variable "database_port" {
  description = "Only this selected database TCP port is permitted from API and worker security groups."
  type        = number
  default     = 5432
}

variable "events_enabled" {
  description = "Add the SQS interface endpoint when the optional business event module is enabled."
  type        = bool
  default     = false
}

variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "region" {
  description = "AWS region of the workload and its service endpoints."
  type        = string
}

variable "cidr" {
  description = "Canonical private IPv4 CIDR /16–/19; fixed subnet offsets preserve resource addresses."
  type        = string
  validation {
    condition     = try(cidrhost(var.cidr, 0) == split("/", var.cidr)[0] && tonumber(split("/", var.cidr)[1]) >= 16 && tonumber(split("/", var.cidr)[1]) <= 19 && can(regex("^(10[.]|172[.](1[6-9]|2[0-9]|3[01])[.]|192[.]168[.])", cidrhost(var.cidr, 0))), false)
    error_message = "Use a canonical RFC1918 IPv4 CIDR between /16 and /19 for this subnet layout."
  }
}

variable "endpoint_az_count" {
  description = "Place interface endpoints in one (lower cost) or two (higher availability) AZs."
  type        = number
}

variable "nat_enabled" {
  description = "Optional single-AZ NAT and API-only general HTTPS egress. Disabled by default."
  type        = bool
}

variable "retention" {
  description = "CloudWatch log retention in whole days."
  type        = number
}
