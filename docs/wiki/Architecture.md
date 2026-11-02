# AWS architecture

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Arquitectura)

Architecture is the product foundation. Luma supplies an executable path through the components before you replace the application.

## Shared and isolated resources

| Shared per installation | Owned by each environment |
| --- | --- |
| ECR and digest-pinned images | VPC and two AZs with application/data subnets |
| One global WAF Web ACL | CloudFront, private frontend S3 and internal ALB |
| S3/KMS state backend with separate states | Fargate API, Cognito and database |
| Installation cost-tag budget | SQS, DLQ and worker when events are enabled |

Dev and Prod have no peering. Sharing WAF, images and state does not connect workload VPCs or mix data. The demo profile is configured as a separate installation.

## Application entry

```text
Browser → HTTPS → CloudFront + WAF
                       ├─ static website → private S3 via OAC
                       └─ /api/* → VPC origin → internal ALB → Fargate API
                                                               └─ IAM + TLS → private data
```

Each environment has its own distribution. WAF inspects inbound web/API HTTP; the database has no direct Internet entry. The backend validates JWTs and owner-scoped permissions.

Cognito supplies AWS managed login. A helper function fetches only its public signing keys and exposes them to the API through the private Lambda endpoint. This helper is not VPC-connected and has no Function URL or business-data permissions. The optional business worker is VPC-connected.

## Network boundaries

- Two application and two data subnets across two AZs. Tasks receive no public IP.
- Five interface endpoints by default: ECR API/DKR, logs, Secrets Manager and Lambda. SQS adds a sixth when enabled. S3 uses a gateway endpoint.
- Dev/demo place interface endpoints in one AZ; Prod uses two. VPC origins require an attached Internet Gateway even when workloads have no public route.
- NAT is off by default. The optional single-AZ NAT permits API HTTPS egress; WAF does not inspect it.
- Browser → CloudFront uses HTTPS; CloudFront → ALB → API uses private HTTP. Service mTLS is not included. Database connections require validated TLS.

[Architecture diagram](https://danieljsaldana.github.io/goliat-forge/diagrams/overview.html) · [Network and security](https://danieljsaldana.github.io/goliat-forge/diagrams/network.html) · [Architecture reference](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/architecture.en.md) · [Security](https://github.com/danieljsaldana/goliat-forge/wiki/Security)
