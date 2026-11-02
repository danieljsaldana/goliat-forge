output "budget_name" {
  description = "Installation budget name; cost-tag activation is required for attribution."
  value       = aws_budgets_budget.installation.name
}
