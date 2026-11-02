resource "aws_cloudwatch_log_group" "keys" {
  name              = "/aws/lambda/${var.name}-identity-keys"
  retention_in_days = var.retention
}

resource "aws_iam_role" "keys" {
  name_prefix = "${var.name}-keys-"
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

resource "aws_iam_role_policy" "keys" {
  role = aws_iam_role.keys.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = "${aws_cloudwatch_log_group.keys.arn}:*"
      }
    ]
    }
  )
}

# No Function URL. Only the API's IAM role may invoke this public-key helper.
# It has public AWS-service egress, and no database, queue or secret permissions.
resource "aws_lambda_function" "keys" {
  function_name                  = "${var.name}-identity-keys"
  role                           = aws_iam_role.keys.arn
  runtime                        = "nodejs24.x"
  handler                        = "apps/identity/keys.handler"
  filename                       = var.archive
  source_code_hash               = filebase64sha256(var.archive)
  architectures                  = ["arm64"]
  memory_size                    = 128
  timeout                        = 10
  reserved_concurrent_executions = 2
  environment {
    variables = {
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.this.id
    }
  }
  depends_on = [aws_iam_role_policy.keys, aws_cloudwatch_log_group.keys]
}
