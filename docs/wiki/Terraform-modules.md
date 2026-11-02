# Terraform modules

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Modulos)

## Three stacks, separate states

| Stack | Responsibility |
| --- | --- |
| [state](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/state) | S3 backend bootstrap with KMS, versioning and lockfile-based locking |
| [shared](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/shared) | ECR registry, global WAF policy and installation budget |
| [environment](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/environment) | Independent Dev, Prod or demo instance: network, identity, web, API, data and optional events |

Shared services do not merge environment states or databases. The CLI retains shared outputs and coordinates deployment order. `--environment all` operates environments in stages; it does not create one combined plan or state.

## Ten modules with explicit contracts

| Module | Purpose |
| --- | --- |
| [state](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/state) | State bucket, encryption and backend protection |
| [registry](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/registry) | ECR repository and immutable images |
| [waf](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/waf) | Global web ACL, managed rules and per-IP rate limit |
| [observability](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/observability) | Installation budget and configurable budget notifications |
| [network](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/network) | VPC, application/data subnets, routes, endpoints and flow logs |
| [edge](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/edge) | CloudFront, private S3/OAC, internal ALB and VPC origin |
| [identity](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/identity) | Cognito, Operators group and public-key verification helper |
| [database](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/database) | Database profile, IAM roles, backups and supported readers |
| [service](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/service) | Fargate, execution/application/migration roles and autoscaling |
| [events](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/events) | SQS, DLQ, private Lambda worker, recovery and DLQ alarm |

Each module has `variables.tf`, `outputs.tf`, provider constraints and a README. Stacks own composition; the application does not use internal resource addresses as its public interface.

## Extending the foundation

Add validated, documented inputs, stable outputs and bilingual documentation. Update the relevant `.auto.tfvars.example` files when adding a public option. Separate permissions by responsibility, review the plan and preserve Terraform addresses when reorganizing files; renaming resources may recreate infrastructure without a state migration.

The CLI applies each stage's saved plan. Do not run concurrent deployments against the same files or state. Locks reduce races; they do not replace change review.

## Verification and its limits

`make check`, `make test` and `make terraform-test` check configuration, CLI, application and Terraform contracts. CI adds TFLint, code analysis and disposable database integration tests. Terraform tests use mocked providers: they do not prove regional compatibility, quotas, instance availability or an actual AWS installation.

[Contracts and quality](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/terraform.en.md) · [Contributing](https://github.com/danieljsaldana/goliat-forge/wiki/Development-and-contributing)
