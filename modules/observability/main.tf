resource "aws_budgets_budget" "installation" {
  name         = "${var.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.amount)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  cost_filter {
    name   = "TagKeyValue"
    values = [format("user:Installation$%s", var.name)]
  }
  dynamic "notification" {
    for_each = length(var.emails) == 0 ? [] : [80, 100]
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value
      threshold_type             = "PERCENTAGE"
      notification_type          = "ACTUAL"
      subscriber_email_addresses = var.emails
    }
  }
}
