resource "aws_wafv2_web_acl" "shared" {
  name        = "${var.name}-edge"
  description = "Shared edge rules for isolated environments"
  scope       = "CLOUDFRONT"
  default_action {
    allow {
    }
  }
  dynamic "rule" {
    for_each = {
      AWSManagedRulesCommonRuleSet = 10, AWSManagedRulesKnownBadInputsRuleSet = 20, AWSManagedRulesSQLiRuleSet = 30
    }
    content {
      name     = rule.key
      priority = rule.value
      override_action {
        none {
        }
      }
      statement {
        managed_rule_group_statement {
          name        = rule.key
          vendor_name = "AWS"
        }
      }
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = rule.key
        sampled_requests_enabled   = false
      }
    }
  }
  rule {
    name     = "RateLimit"
    priority = 40
    action {
      block {
      }
    }
    statement {
      rate_based_statement {
        limit                 = var.rate_limit
        evaluation_window_sec = 300
        aggregate_key_type    = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = false
    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name}-edge"
    sampled_requests_enabled   = false
  }
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.name}"
  retention_in_days = var.retention
}

resource "aws_wafv2_web_acl_logging_configuration" "shared" {
  resource_arn            = aws_wafv2_web_acl.shared.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
  redacted_fields {
    single_header {
      name = "cookie"
    }
  }
  redacted_fields {
    query_string {
    }
  }
}
