variable "database_port" {
  type    = number
  default = 5432
}

variable "events_enabled" {
  type    = bool
  default = false
}

variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "cidr" {
  type = string
}

variable "endpoint_az_count" {
  type = number
}

variable "nat_enabled" {
  type = bool
}

variable "retention" {
  type = number
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = var.name
  }
}

# CloudFront VPC origins require an attached IGW, even with no Internet route.
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

resource "aws_subnet" "app" {
  count                   = 2
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 8, count.index + 10)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "${var.name}-app-${count.index + 1}"
  }
}

resource "aws_subnet" "data" {
  count                   = 2
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 8, count.index + 20)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "${var.name}-data-${count.index + 1}"
  }
}

resource "aws_route_table" "app" {
  vpc_id = aws_vpc.this.id
}

resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id
}

resource "aws_route_table_association" "app" {
  count          = 2
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app.id
}

resource "aws_route_table_association" "data" {
  count          = 2
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  description = "Only CloudFront origin-facing connections"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "app" {
  name_prefix = "${var.name}-app-"
  description = "Private application and migration tasks"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "worker" {
  name_prefix = "${var.name}-worker-"
  description = "Private event worker"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "database" {
  name_prefix = "${var.name}-db-"
  description = "Selected database port from application and worker security groups only"
  vpc_id      = aws_vpc.this.id
}

resource "aws_security_group" "endpoints" {
  name_prefix = "${var.name}-endpoints-"
  description = "HTTPS to AWS interface endpoints"
  vpc_id      = aws_vpc.this.id
}

resource "aws_vpc_security_group_ingress_rule" "alb" {
  security_group_id = aws_security_group.alb.id
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "app" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "alb" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "database" {
  for_each = {
    app = aws_security_group.app.id, worker = aws_security_group.worker.id
  }
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = each.value
  from_port                    = var.database_port
  to_port                      = var.database_port
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "database" {
  for_each = {
    app = aws_security_group.app.id, worker = aws_security_group.worker.id
  }
  security_group_id            = each.value
  referenced_security_group_id = aws_security_group.database.id
  from_port                    = var.database_port
  to_port                      = var.database_port
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "endpoints" {
  for_each = {
    app = aws_security_group.app.id, worker = aws_security_group.worker.id
  }
  security_group_id            = aws_security_group.endpoints.id
  referenced_security_group_id = each.value
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "endpoints" {
  for_each = {
    app = aws_security_group.app.id, worker = aws_security_group.worker.id
  }
  security_group_id            = each.value
  referenced_security_group_id = aws_security_group.endpoints.id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
}

resource "aws_vpc_endpoint" "interface" {
  for_each            = toset(concat(["ecr.api", "ecr.dkr", "logs", "secretsmanager", "lambda"], var.events_enabled ? ["sqs"] : []))
  vpc_id              = aws_vpc.this.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = slice(aws_subnet.app[*].id, 0, var.endpoint_az_count)
  security_group_ids  = [aws_security_group.endpoints.id]
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.app.id]
}

resource "aws_vpc_security_group_egress_rule" "s3" {
  security_group_id = aws_security_group.app.id
  prefix_list_id    = aws_vpc_endpoint.s3.prefix_list_id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# Optional general HTTPS egress. This is not WAF-inspected outbound traffic.
resource "aws_subnet" "public" {
  count                   = var.nat_enabled ? 1 : 0
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.cidr, 8, 1)
  availability_zone       = local.azs[0]
  map_public_ip_on_launch = false
}

resource "aws_route_table" "public" {
  count  = var.nat_enabled ? 1 : 0
  vpc_id = aws_vpc.this.id
}

resource "aws_route" "public" {
  count                  = var.nat_enabled ? 1 : 0
  route_table_id         = aws_route_table.public[0].id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = var.nat_enabled ? 1 : 0
  subnet_id      = aws_subnet.public[0].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_eip" "nat" {
  count  = var.nat_enabled ? 1 : 0
  domain = "vpc"
}

resource "aws_nat_gateway" "this" {
  count         = var.nat_enabled ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.this]
}

resource "aws_route" "nat" {
  count                  = var.nat_enabled ? 1 : 0
  route_table_id         = aws_route_table.app.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

resource "aws_vpc_security_group_egress_rule" "nat" {
  count             = var.nat_enabled ? 1 : 0
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_cloudwatch_log_group" "flow" {
  name              = "/forge/${var.name}/vpc"
  retention_in_days = var.retention
}

resource "aws_iam_role" "flow" {
  name_prefix = "${var.name}-flow-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }, Action = "sts:AssumeRole"
      }
    ]
    }
  )
}

resource "aws_iam_role_policy" "flow" {
  role = aws_iam_role.flow.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"], Resource = [aws_cloudwatch_log_group.flow.arn, "${aws_cloudwatch_log_group.flow.arn}:*"]
      }
    ]
    }
  )
}

resource "aws_flow_log" "this" {
  vpc_id          = aws_vpc.this.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow.arn
  log_destination = aws_cloudwatch_log_group.flow.arn
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "app_subnets" {
  value = aws_subnet.app[*].id
}

output "data_subnets" {
  value = aws_subnet.data[*].id
}

output "alb_sg" {
  value = aws_security_group.alb.id
}

output "app_sg" {
  value = aws_security_group.app.id
}

output "worker_sg" {
  value = aws_security_group.worker.id
}

output "database_sg" {
  value = aws_security_group.database.id
}

output "availability_zones" { value = local.azs }
