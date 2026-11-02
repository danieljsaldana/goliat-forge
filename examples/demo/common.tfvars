# Shared resources consumed by Dev and Prod. No credentials or real account IDs.
common = {
  name   = "forge-demo"
  region = "eu-west-1" # Ireland; choose a CloudFront VPC-origin supported region.

  # Budget alerts are advisory; they never stop resources automatically.
  monthly_budget_usd = 50
  alert_emails       = [] # Add an address you control; activate the Installation cost tag.
  log_retention_days = 30

  tags = { Owner = "platform-team", Project = "example" }
}
