variable "frontend_script_hashes" {
  description = "Exact Next.js inline-script CSP hashes produced by the frontend build."
  type        = list(string)
  default     = []
}

variable "name" {
  description = "Stable resource prefix for this module instance."
  type        = string
}

variable "vpc_id" {
  description = "Workload VPC ID containing the private ALB."
  type        = string
}

variable "subnets" {
  description = "Private workload subnet IDs in two availability zones."
  type        = list(string)
}

variable "alb_sg" {
  description = "ALB security group permitting CloudFront origin-facing traffic only."
  type        = string
}

variable "waf_arn" {
  description = "Global WAF Web ACL ARN shared by environment CloudFront distributions."
  type        = string
}

variable "region" {
  description = "AWS region of the workload and its service endpoints."
  type        = string
}

variable "protect" {
  description = "Enable deletion protection; disable explicitly before reviewed teardown."
  type        = bool
}

variable "portals" {
  description = "Map of URL paths to sample labels and requester/operator views; backend authorization remains mandatory."
  type = map(object({
    label = string, view = string
    }
  ))
}

variable "domain_name" {
  description = "Optional DNS hostname for HTTPS; null uses the generated CloudFront hostname for Dev/demo."
  type        = string
}

variable "certificate_arn" {
  description = "Validated ACM certificate ARN in us-east-1; supplied together with domain_name."
  type        = string
}
