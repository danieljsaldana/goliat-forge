data "aws_caller_identity" "current" {
}

resource "aws_sqs_queue" "dlq" {
  name                      = "${var.name}-dead-letter"
  message_retention_seconds = var.settings.dlq_retention_days * 86400
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "requests" {
  name                       = "${var.name}-requests"
  visibility_timeout_seconds = var.settings.worker_timeout * 6
  message_retention_seconds  = var.settings.retention_days * 86400
  sqs_managed_sse_enabled    = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn, maxReceiveCount = var.settings.max_receive_count
    }
  )
}

resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue", sourceQueueArns = [aws_sqs_queue.requests.arn]
    }
  )
}

resource "aws_sqs_queue_policy" "requests" {
  queue_url = aws_sqs_queue.requests.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Deny", Principal = "*", Action = "sqs:*", Resource = aws_sqs_queue.requests.arn, Condition = {
        Bool = {
          "aws:SecureTransport" = "false"
        }
      }
      }
    ]
    }
  )
}

resource "aws_sqs_queue_policy" "dlq" {
  queue_url = aws_sqs_queue.dlq.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect    = "Deny", Principal = "*", Action = "sqs:*", Resource = aws_sqs_queue.dlq.arn,
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_iam_role" "worker" {
  name_prefix = "${var.name}-worker-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "lambda.amazonaws.com"
      }, Action = "sts:AssumeRole"
      }
    ]
    }
  )
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/aws/lambda/${var.name}-worker"
  retention_in_days = var.retention
}

resource "aws_iam_role_policy" "worker" {
  role = aws_iam_role.worker.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.worker.arn}:*"
      },
      {
        Effect = "Allow", Action = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:SendMessage"], Resource = aws_sqs_queue.requests.arn
      },
      {
        Effect = "Allow", Action = ["ec2:CreateNetworkInterface", "ec2:DescribeNetworkInterfaces", "ec2:DescribeSubnets", "ec2:DeleteNetworkInterface", "ec2:AssignPrivateIpAddresses", "ec2:UnassignPrivateIpAddresses"], Resource = "*"
      }
      ], var.database_driver == "documentdb" ? [] : [{
        Effect = "Allow", Action = "rds-db:connect", Resource = [for id in var.database_resource_ids : "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${id}/forge_worker"]
    }])
    }
  )
}

resource "aws_lambda_function" "worker" {
  function_name                  = "${var.name}-worker"
  role                           = aws_iam_role.worker.arn
  runtime                        = "nodejs24.x"
  handler                        = "apps/worker/handler.handler"
  filename                       = var.archive
  source_code_hash               = filebase64sha256(var.archive)
  architectures                  = ["arm64"]
  memory_size                    = var.settings.worker_memory_mb
  timeout                        = var.settings.worker_timeout
  reserved_concurrent_executions = var.settings.max_concurrency + 1
  vpc_config {
    subnet_ids         = var.subnets
    security_group_ids = [var.security_group]
  }
  environment {
    variables = merge({ for k, v in var.environment : k => v if k != "AWS_REGION" }, {
      DB_USER = "forge_worker", QUEUE_URL = aws_sqs_queue.requests.id
      }
    )
  }
  depends_on = [aws_iam_role_policy.worker, aws_cloudwatch_log_group.worker]
}

resource "aws_lambda_event_source_mapping" "requests" {
  event_source_arn = aws_sqs_queue.requests.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = var.settings.batch_size
  scaling_config { maximum_concurrency = var.settings.max_concurrency }
  function_response_types = ["ReportBatchItemFailures"]
  enabled                 = var.active
}

resource "aws_cloudwatch_event_rule" "recovery" {
  name                = "${var.name}-outbox"
  schedule_expression = "rate(${var.settings.recovery_minutes} ${var.settings.recovery_minutes == 1 ? "minute" : "minutes"})"
  state               = var.active ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "recovery" {
  rule = aws_cloudwatch_event_rule.recovery.name
  arn  = aws_lambda_function.worker.arn
  input = jsonencode({
    kind = "outbox-recovery"
    }
  )
}

resource "aws_lambda_permission" "recovery" {
  statement_id   = "OutboxRecovery"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.worker.function_name
  principal      = "events.amazonaws.com"
  source_arn     = aws_cloudwatch_event_rule.recovery.arn
  source_account = data.aws_caller_identity.current.account_id
}

resource "aws_cloudwatch_metric_alarm" "dead_letters" {
  alarm_name          = "${var.name}-dead-letters"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }
}
