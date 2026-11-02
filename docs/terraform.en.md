# Terraform: modules and configuration contracts

[Español](terraform.md) · [Configuration](configuration.en.md) · [Product](product.en.md)

Goliat Forge has three root stacks: `state` creates the backend, `shared` composes common services, and `environment` composes Dev, Prod or a separate demo. Each environment owns its state, VPC, data, identity and application. Shared ECR and WAF do not connect workload VPCs.

## Responsibilities

| Module | Responsibility | Scope |
| --- | --- | --- |
| state | Encrypted, versioned S3/KMS state and locking | Bootstrap |
| registry | Immutable ECR and untagged image cleanup | Shared |
| waf | Managed Web ACL rules, per-IP limit and redacted logs | Shared |
| observability | Installation cost-tag budget | Shared |
| network | App/data subnets, SGs, routes, endpoints and flow logs | Environment |
| edge | Private S3, CloudFront, OAC and internal ALB | Environment |
| identity | Cognito and public-key helper function | Environment |
| database | One of PostgreSQL, Aurora PostgreSQL/MySQL or DocumentDB | Environment |
| service | Fargate API, separate migration role/task and scaling | Environment |
| events | SQS, DLQ, worker and outbox recovery | Optional environment |

Each module contains typed, documented `variables.tf`, an `outputs.tf` contract, resource code and a bilingual README. Root stacks own providers and installation tags. File organization does not change Terraform resource addresses. Reader maps use stable keys; `primary` is reserved for the writer.

## User configuration

Complete common, Dev, Prod and demo `auto.tfvars.example` templates cover every public product input. The CLI produces runtime configuration and keeps real account metadata in ignored directories. Credentials use AWS SSO or federation outside tfvars.

Tests compare public fields and nested objects against templates and verify override precedence. The CLI explicitly passes auto files from `--config`; it does not discover arbitrary directories. Whole objects replace previous values; there is no deep merge.

Not every AWS attribute is exposed. IAM policies, subnet topology, internal origin TLS, maintenance windows and application schema are code decisions. Changing them requires reviewing the modules and application.

## Reproducible checks

```sh
make check
make test
make terraform-test
make site-check
```

Terraform tests use mocked providers and never create AWS resources. They cover private access, WAF/OAC, separate administrator secrets, deletion protection, data engines/readers, capacity and worker/queue timeout consistency. CI also exercises data contracts with disposable PostgreSQL, MySQL and MongoDB databases without an AWS account.

Validation and mocks cannot verify account quotas, regional instance-class availability, certificate coverage or real IAM deployment permissions. Before production, review the real plan, restore a test backup and verify endpoints using users with distinct permissions.

## Boundaries

- Each environment selects one data engine. Switching profiles requires data migration and review of every planned deletion.
- The reference app reads from the writer. Reader endpoints are available for future application changes.
- Terraform reconciles `desired_count` to `replicas` on apply, including after autoscaling has raised capacity.
- Optional NAT uses one AZ. WAF inspects inbound CloudFront HTTP, not SQL, events, NAT egress or Cognito managed login.
- CloudFront → ALB → API uses private HTTP hops. This profile does not implement service-to-service mTLS; database connections do require validated TLS.
- Repeated teardown needs a unique final snapshot name. Set `db_final_snapshot_identifier` when the default already exists.
- Bootstrap state is deliberately retained; S3/ECR data and backups are never automatically purged.
