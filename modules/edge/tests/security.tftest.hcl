mock_provider "aws" {

  source = "../../tests/mocks"

}

variables {

  name    = "forge-dev"
  vpc_id  = "vpc-00000000000000001"
  subnets = ["subnet-00000000000000001", "subnet-00000000000000002"]
  alb_sg  = "sg-00000000000000001"
  waf_arn = "arn:aws:wafv2:us-east-1:000000000000:global/webacl/example/00000000-0000-4000-8000-000000000000"
  region  = "eu-west-1"
  protect = true
  portals = {
    tenant = {
      label = "Requests", view = "requester"
    }

  }

  domain_name     = null
  certificate_arn = null

}

run "private_origins" {
  command = apply
  assert {
    condition     = aws_lb.api.internal && aws_lb.api.drop_invalid_header_fields
    error_message = "The ALB must remain internal."

  }

  assert {
    condition     = aws_s3_bucket_public_access_block.web.block_public_policy && aws_s3_bucket_public_access_block.web.restrict_public_buckets
    error_message = "The frontend S3 origin must not be public."

  }

  assert {
    condition     = aws_cloudfront_origin_access_control.web.signing_behavior == "always"
    error_message = "CloudFront must sign private S3 origin requests."

  }

  assert {
    condition     = aws_cloudfront_distribution.web.web_acl_id == var.waf_arn
    error_message = "Every distribution must use the shared WAF."

  }


}
