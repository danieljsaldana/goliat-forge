# Architecture, networks and boundaries

[Español](architecture.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

## Application entry

Browsers use HTTPS to CloudFront and the shared WAF evaluates incoming HTTP. Private S3 supplies frontend assets through Origin Access Control. The /api/* behavior disables caching and forwards Authorization with AllViewerExceptHostHeader. VPC origins connects CloudFront to an internal ALB, which forwards to private Fargate. No second public API Gateway path or parallel NLB is created.

## Environment VPC

Each environment has two application and two data subnets in two AZs. Tasks have no public IP. The ALB accepts the CloudFront origin-facing managed prefix; the API accepts only its ALB SG. PostgreSQL accepts port 5432 only from API and worker SGs. Data subnets have no NAT route.

An attached Internet Gateway is required by CloudFront VPC origins, but default workload route tables have no Internet route. ECR API/DKR, logs, Secrets Manager and Lambda use five interface endpoints. SQS adds the sixth only when events are enabled. S3 uses a gateway endpoint. Dev/demo place interfaces in one AZ; Prod uses two. Verify supported regions/AZs and the CloudFront prefix list weight against SG quotas.

## Identity without general API egress

aws-jwt-verify validates Cognito JWTs. When a signing key is needed or rotated, the API invokes a helper Lambda through the private Lambda endpoint. The helper has no Function URL, runs outside the VPC and has no database, queue or secret permissions. It fetches only the configured Cognito pool public keys, which the container verifier caches. Cognito login itself is a public managed AWS service outside the application WAF.

## Explicit encryption boundaries

Browser → CloudFront uses HTTPS. CloudFront → ALB and ALB → API use HTTP on the private path. PostgreSQL requires TLS with RDS certificate-chain validation. AWS API calls use HTTPS and IAM roles. This foundation does not implement mTLS or TLS for every internal hop. Add origin certificates and service TLS before production acceptance if your policy requires end-to-end TLS.

AWS fixes the generated CloudFront hostname certificate policy to TLSv1. Prod therefore requires a custom domain and ACM certificate in us-east-1 to use TLSv1.2_2021. DNS remains your responsibility: create the domain alias/CNAME to the distribution.

## Outside WAF inspection

SQL, SQS, Lambda invocation, ECR pulls and state access use their own IAM and network controls. WAF is not an outbound firewall. nat_enabled explicitly adds general HTTPS API egress, incurs charges and does not make that traffic WAF-inspected. The optional single-AZ NAT is not highly available; extend per AZ when required.

Sources: [VPC origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html), [CloudFront TLS policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesGeneral.html), [Lambda PrivateLink](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-endpoints.html).
