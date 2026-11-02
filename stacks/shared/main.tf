module "registry" {
  source = "../../modules/registry"
  name   = var.common.name
}

module "waf" {
  source = "../../modules/waf"
  providers = {
    aws = aws.edge
  }
  name       = var.common.name
  retention  = var.common.log_retention_days
  rate_limit = var.common.waf_rate_limit
}

module "observability" {
  source = "../../modules/observability"
  name   = var.common.name
  amount = var.common.monthly_budget_usd
  emails = var.common.alert_emails
}

output "platform" {
  value = {
    name = var.common.name, region = var.common.region, ecr_url = module.registry.url, ecr_arn = module.registry.arn, waf_arn = module.waf.arn
  }
}
