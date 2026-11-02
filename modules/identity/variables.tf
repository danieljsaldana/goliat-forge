variable "archive" {
  description = "Absolute path to the locally packaged, versioned Lambda source archive."
  type        = string
}

variable "retention" {
  description = "CloudWatch log retention in whole days."
  type        = number
}

variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "url" {
  description = "Public application origin used for Cognito callback and logout URLs."
  type        = string
}

variable "mfa" {
  description = "Require Cognito TOTP MFA when true; optional enrollment otherwise."
  type        = bool
}

variable "protect" {
  description = "Protect the user pool from deletion together with the environment data."
  type        = bool
  default     = true
}
