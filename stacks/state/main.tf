terraform {
  required_version = ">= 1.10.0, < 2.0.0"
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "6.71.0"
    }
  }
}

variable "name" {
  type = string
}

variable "region" {
  type = string
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {
}

module "state" {
  source = "../../modules/state"
  bucket = "${var.name}-${data.aws_caller_identity.current.account_id}-${var.region}-state"
}

output "backend" {
  value = {
    bucket = module.state.bucket, region = var.region, kms_key_id = module.state.kms_arn, encrypt = true, use_lockfile = true
  }
}
