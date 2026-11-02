data "aws_caller_identity" "current" {
}

locals {
  trust = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "ecs-tasks.amazonaws.com"
        }, Action = "sts:AssumeRole", Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        ArnLike      = { "aws:SourceArn" = "arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:*" }
      }
      }
    ]
    }
  )
}

resource "aws_ecs_cluster" "this" {
  name = var.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/forge/${var.name}/api"
  retention_in_days = var.retention
}

resource "aws_iam_role" "execution" {
  name_prefix        = "${var.name}-exec-"
  assume_role_policy = local.trust
}

resource "aws_iam_role_policy" "execution" {
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = "ecr:GetAuthorizationToken", Resource = "*"
      },
      {
        Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = var.ecr_arn
      },
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      }
    ]
    }
  )
}

resource "aws_iam_role" "api" {
  name_prefix        = "${var.name}-api-"
  assume_role_policy = local.trust
}

resource "aws_iam_role_policy" "api" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([{
      Effect = "Allow", Action = "lambda:InvokeFunction", Resource = var.key_relay_arn
      }], var.database_driver == "documentdb" ? [] : [
      {
        Effect = "Allow", Action = "rds-db:connect", Resource = [for id in var.database_resource_ids : "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${id}/forge_api"]
      }
      ], var.queue_arn == null ? [] : [{
        Effect = "Allow", Action = "sqs:SendMessage", Resource = var.queue_arn
      }
    ])
    }
  )
}

resource "aws_iam_role" "migration" {
  name_prefix        = "${var.name}-migrate-"
  assume_role_policy = local.trust
}

resource "aws_iam_role_policy" "migration" {
  role = aws_iam_role.migration.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = concat([
      {
        Effect = "Allow", Action = "secretsmanager:GetSecretValue", Resource = var.admin_secret_arn
      }
      ], var.database_kms_arn == null ? [] : [
      {
        Effect = "Allow", Action = "kms:Decrypt", Resource = var.database_kms_arn, Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.region}.amazonaws.com"
          }
        }
      }
    ])
    }
  )
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(var.cpu)
  memory                   = tostring(var.memory)
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.api.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }
  container_definitions = jsonencode([{
    name = "api", image = var.image, essential = true, user = "10001", readonlyRootFilesystem = true, portMappings = [{
      containerPort = 8080, protocol = "tcp"
      }
      ], environment = [for k, v in merge(var.environment, {
        DB_USER = "forge_api"
        }
        ) : {
        name = k, value = v
      }
      ], linuxParameters = {
      initProcessEnabled = true
      }, logConfiguration = {
      logDriver = "awslogs", options = {
        "awslogs-group" = aws_cloudwatch_log_group.api.name, "awslogs-region" = var.region, "awslogs-stream-prefix" = "api"
      }
    }
    }
  ])
}

resource "aws_ecs_task_definition" "migration" {
  family                   = "${var.name}-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.migration.arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }
  container_definitions = jsonencode([{
    name = "migration", image = var.image, essential = true, user = "10001", readonlyRootFilesystem = true, command = ["node", "apps/api/migrate.mjs"], environment = [for k, v in merge(var.environment, {
      ADMIN_SECRET_ARN = var.admin_secret_arn, DB_API_ROLE_ARN = aws_iam_role.api.arn, DB_WORKER_ROLE_ARN = var.worker_role_arn
      }
      ) : {
      name = k, value = v
      }
      ], logConfiguration = {
      logDriver = "awslogs", options = {
        "awslogs-group" = aws_cloudwatch_log_group.api.name, "awslogs-region" = var.region, "awslogs-stream-prefix" = "migration"
      }
    }
    }
  ])
  depends_on = [aws_iam_role_policy.execution, aws_iam_role_policy.migration]
}

resource "aws_ecs_service" "api" {
  name                              = "api"
  cluster                           = aws_ecs_cluster.this.id
  task_definition                   = aws_ecs_task_definition.api.arn
  launch_type                       = "FARGATE"
  platform_version                  = "1.4.0"
  desired_count                     = var.active ? var.replicas : 0
  enable_execute_command            = false
  health_check_grace_period_seconds = 60
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = var.subnets
    security_groups  = [var.security_group]
    assign_public_ip = false
  }
  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "api"
    container_port   = 8080
  }
  propagate_tags = "SERVICE"
  # Keep task permissions available throughout service creation and draining.
  depends_on = [aws_iam_role_policy.execution, aws_iam_role_policy.api]
}

resource "aws_appautoscaling_target" "api" {
  count              = var.active ? 1 : 0
  max_capacity       = var.max_replicas
  min_capacity       = var.replicas
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api" {
  count              = var.active ? 1 : 0
  name               = "${var.name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  target_tracking_scaling_policy_configuration {
    target_value = var.autoscaling.target_cpu
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    scale_in_cooldown  = var.autoscaling.scale_in_cooldown
    scale_out_cooldown = var.autoscaling.scale_out_cooldown
  }
}
