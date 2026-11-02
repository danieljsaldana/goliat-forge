provider "aws" {
  region = var.common.region
  default_tags {
    tags = merge(var.common.tags, {
      Product = "Goliat Forge", Installation = var.common.name, ManagedBy = "Terraform", Environment = var.environment.name
      }
    )
  }
}

provider "aws" {
  alias  = "edge"
  region = "us-east-1"
  default_tags {
    tags = merge(var.common.tags, {
      Product = "Goliat Forge", Installation = var.common.name, ManagedBy = "Terraform", Environment = var.environment.name
      }
    )
  }
}
