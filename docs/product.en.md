# Goliat Forge · Product guide

[Español](product.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

Goliat Forge is a modular AWS application foundation. It combines Terraform, commented configuration, deployment tooling and Luma, a reference frontend, API and asynchronous worker. Replace the sample application with your own business code; this is not a business application generator.

## Shared once

ECR holds an immutable application image consumed by the environments. A global Web ACL applies common rules to their CloudFront distributions. Terraform state uses encrypted, versioned S3 with KMS and native state locking. AWS Budgets observes installation-tagged spend. Sharing avoids duplication; it does not remove per-environment charges.

## Owned by each environment

Each environment owns its VPC, application/data subnets, security groups, endpoints, S3 frontend, internal ALB, CloudFront distribution, Cognito pool, Fargate service, RDS instance and identities. Optional business events add SQS, a DLQ, a VPC-connected Lambda worker and an outbox recovery timer. There is no environment peering. This edition uses one AWS account and one workload region; global WAF is managed in us-east-1. Separate AWS accounts require adapting cross-account permissions and state.

## What Luma does

Authenticated users register and read their own requests. Cognito Operators can inspect all requests. In basic mode the API saves directly to PostgreSQL. When SQS is enabled, it commits the request and outbox in the same transaction, then attempts delivery. The worker records an activity and updates status transactionally. Replaying an event does not create another business activity. Approvals, payments, business email and industry-specific workflows are not included.

The tenant and admin portals are two static views of the same sample, served from one bucket. Another portals map entry adds a URL to an existing view; it does not generate another application or duplicate containers.

## Three evaluation modes

- The product website has an in-browser memory laboratory, without AWS.
- npm run demo serves Luma and an in-memory API on 127.0.0.1 only. Data disappears when the process stops.
- The Terraform demo profile is a real, billable AWS installation with its own name and state. It does not replace RDS with memory or disable Cognito.

The foundation is checked locally with PostgreSQL 17 and mocked Terraform providers. Each installation still needs real AWS acceptance and production validation. This copy is not represented as deployed or production-certified.

## Start simple

The reference frontend is Next.js with a static export. The default path is frontend → private Node.js API → private PostgreSQL. SQS is an opt-in extension, not a requirement for a normal web application. Enable events_enabled only when asynchronous work is useful.
