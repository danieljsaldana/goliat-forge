variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "amount" {
  description = "Monthly installation budget in USD; alerts do not stop resources."
  type        = number
}

variable "emails" {
  description = "Optional budget notification recipients; no more than ten addresses."
  type        = list(string)
}
