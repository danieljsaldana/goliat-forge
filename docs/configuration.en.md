# Variables, tfvars and modularity

[Español](configuration.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

## Files

| File | Purpose |
| --- | --- |
| environments/common.tfvars | Shared name, region, tags, budget and retention |
| environments/dev.tfvars | Dev capacity and behavior |
| environments/prod.tfvars | Prod capacity and protections |
| examples/demo/ | Separate evaluation installation |
| environments/*.auto.tfvars.example | Documented HCL local-override templates |
| .local/config/<environment>.auto.tfvars | Git-ignored user override explicitly passed last by the CLI |
| .forge/.../runtime/<environment>.auto.tfvars.json | CLI-generated digest, shared outputs and function artifact path |

HCL .tfvars support comments; generated JSON does not. Terraform replaces whole objects instead of deep-merging them: common/environment overrides need a complete object with required fields. Never add access keys, tokens, passwords or database credentials. backend.json contains backend metadata and an account identifier, not access keys.

## Shared settings

common.name identifies the installation; do not rename it for a normal update. region selects the workload region, while global WAF stays in us-east-1. tags are applied alongside Installation and Product. monthly_budget_usd is a notification threshold, alert_emails defaults empty and log_retention_days must be CloudWatch-supported.

## Environment settings

name selects a separate state. vpc_cidr is subdivided into application/data ranges; choose suitable private, non-overlapping ranges. endpoint_az_count is 1 or 2. nat_enabled defaults false. cpu/memory must be a supported Fargate pair; replica bounds are integers. CPU target tracking uses 60%; a later Terraform apply reconciles desired capacity to configuration.

RDS uses db_instance_class, db_storage_gb and db_engine_version. The parameter family is PostgreSQL 17; changing a major version also needs a parameter-group change and migration plan. db_multi_az provides availability, not an application-readable replica. db_backup_days, deletion_protection and skip_final_snapshot control recovery/deletion. mfa_required enables mandatory TOTP.

domain_name and certificate_arn are paired and required for Prod. The validated ACM certificate must cover the hostname and reside in us-east-1. Domain purchase and public DNS configuration are not automated.

portals is a label/view map using requester or operator. Add a partners entry without new enable_web_* flags. api, callback and config are reserved paths. Backend identity and authorization are independent of portal naming.

## Disabling business events

events_enabled removes the business worker, queue and DLQ. The Cognito signing-key helper remains necessary for authentication. Requests stay in PostgreSQL; AWS never silently switches to memory processing. Events are disabled by default: new requests create no outbox row and do not wait for a worker. Enabling events affects new requests, without replaying previous basic-mode requests. Review queued data before destroying a queue.

## Internal runtime values

The CLI coordinates platform, api_image, worker_archive, frontend_script_hashes and activate_workloads. Image digests are immutable and belong to this installation ECR. Lambda archives are generated locally; ZIP artifacts are not versioned. Initial activation follows database migration. Override templates are examples rather than real account configuration.

The CLI loads local.auto.tfvars after generated runtime values, followed by the environment-specific override (dev.auto.tfvars or prod.auto.tfvars). Files are loaded explicitly from --config, not discovered in arbitrary directories.

## Complete auto.tfvars and loading order

`./forge configure` copies commented templates into the configuration directory. Activate only the overrides you need by removing `.example`:

| Local file | Scope |
| --- | --- |
| `common.auto.tfvars` | Every public `common` option: installation name/region, tags, budget, recipients and retention |
| `dev.auto.tfvars` / `prod.auto.tfvars` | Every public `environment` option, including engine, reader sizes/AZs/priorities, portals, SQS, MFA and domain |
| `local.auto.tfvars` | Advanced runtime overrides: image, shared outputs, function archive, CSP hashes and activation. All settings are commented by default |

Effective order: `common.tfvars` → `common.auto.tfvars` → `<environment>.tfvars` → generated CLI runtime → `local.auto.tfvars` → `<environment>.auto.tfvars`. The shared override also applies to the shared stack. Objects replace as a whole; use the complete templates. Keep the name/region selected through `configure`; prepare a new installation and migration for a different identity or region.

AWS account selection, SSO and operator permissions stay outside tfvars. AWS manages administrator passwords. The separate demo profile includes its own template. Tests compare Terraform's public fields against the templates to detect undocumented options.

Templates cover **the product's public inputs**. Internal WAF rules, health-check intervals, service TLS configuration and exact IAM policies remain in their modules. Changing arbitrary AWS attributes requires code changes and a security review. Generated runtime parameters are not credentials.
