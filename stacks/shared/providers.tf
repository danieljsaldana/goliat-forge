provider "aws" {
  region = var.common.region
  default_tags {
    tags = merge(var.common.tags, {
      Product = "Goliat Forge", Installation = var.common.name, ManagedBy = "Terraform"
      }
    )
  }
}

provider "aws" {
  alias  = "edge"
  region = "us-east-1"
  default_tags {
    tags = merge(var.common.tags, {
      Product = "Goliat Forge", Installation = var.common.name, ManagedBy = "Terraform"
      }
    )
  }
}
