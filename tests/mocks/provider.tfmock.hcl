mock_data "aws_caller_identity" {
  defaults = { account_id = "000000000000", arn = "arn:aws:iam::000000000000:root" }
}
mock_data "aws_availability_zones" {
  defaults = { names = ["eu-west-1a", "eu-west-1b"] }
}
mock_data "aws_ec2_managed_prefix_list" {
  defaults = { id = "pl-00000000000000000" }
}
mock_resource "aws_iam_role" {
  defaults = { arn = "arn:aws:iam::000000000000:role/example" }
}
mock_resource "aws_kms_key" {
  defaults = { arn = "arn:aws:kms:eu-west-1:000000000000:key/00000000-0000-4000-8000-000000000000" }
}
mock_resource "aws_s3_bucket" {
  defaults = { arn = "arn:aws:s3:::example-forge-test", bucket_regional_domain_name = "example-forge-test.s3.eu-west-1.amazonaws.com" }
}
mock_resource "aws_lb" {
  defaults = { arn = "arn:aws:elasticloadbalancing:eu-west-1:000000000000:loadbalancer/app/example/0000000000000000", dns_name = "internal-example.eu-west-1.elb.amazonaws.com" }
}
mock_resource "aws_lb_target_group" {
  defaults = { arn = "arn:aws:elasticloadbalancing:eu-west-1:000000000000:targetgroup/example/0000000000000000" }
}
mock_resource "aws_ecs_cluster" {
  defaults = { arn = "arn:aws:ecs:eu-west-1:000000000000:cluster/example", id = "arn:aws:ecs:eu-west-1:000000000000:cluster/example" }
}
mock_resource "aws_ecs_task_definition" {
  defaults = { arn = "arn:aws:ecs:eu-west-1:000000000000:task-definition/example:1" }
}
mock_resource "aws_cloudwatch_log_group" {
  defaults = { arn = "arn:aws:logs:eu-west-1:000000000000:log-group:example" }
}
mock_resource "aws_sqs_queue" {
  defaults = { arn = "arn:aws:sqs:eu-west-1:000000000000:example", id = "https://sqs.eu-west-1.amazonaws.com/000000000000/example" }
}
mock_resource "aws_lambda_function" {
  defaults = { arn = "arn:aws:lambda:eu-west-1:000000000000:function:example" }
}
mock_resource "aws_cloudfront_distribution" {
  defaults = { arn = "arn:aws:cloudfront::000000000000:distribution/EXAMPLE", domain_name = "example.cloudfront.net" }
}
mock_resource "aws_cognito_user_pool" {
  defaults = { id = "eu-west-1_Example" }
}
mock_resource "aws_vpc_endpoint" {
  defaults = { prefix_list_id = "pl-00000000000000000" }
}
mock_resource "aws_db_instance" {
  defaults = { arn = "arn:aws:rds:eu-west-1:000000000000:db:example", address = "database.example.invalid", resource_id = "db-EXAMPLE", master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:example-AbCdEf", kms_key_id = "arn:aws:kms:eu-west-1:000000000000:key/00000000-0000-4000-8000-000000000000", secret_status = "active" }] }
}
mock_resource "aws_cloudfront_function" {
  defaults = {
    arn = "arn:aws:cloudfront::000000000000:function/example"
  }
}
mock_resource "aws_cloudwatch_event_rule" {
  defaults = {
    arn = "arn:aws:events:eu-west-1:000000000000:rule/example"
  }
}

mock_data "aws_rds_engine_version" {
  defaults = { version = "17.9", parameter_group_family = "aurora-postgresql17" }
}
mock_resource "aws_rds_cluster" {
  defaults = { arn = "arn:aws:rds:eu-west-1:000000000000:cluster:example", endpoint = "aurora.example.invalid", reader_endpoint = "aurora-ro.example.invalid", cluster_resource_id = "cluster-AURORA", master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:aurora-AbCdEf", kms_key_id = "arn:aws:kms:eu-west-1:000000000000:key/00000000-0000-4000-8000-000000000000", secret_status = "active" }] }
}
mock_resource "aws_docdb_cluster" {
  defaults = { arn = "arn:aws:rds:eu-west-1:000000000000:cluster:documentdb", endpoint = "docdb.example.invalid", reader_endpoint = "docdb-ro.example.invalid", cluster_resource_id = "cluster-DOCUMENT", master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:eu-west-1:000000000000:secret:docdb-AbCdEf", kms_key_id = "arn:aws:kms:eu-west-1:000000000000:key/00000000-0000-4000-8000-000000000000", secret_status = "active" }] }
}
