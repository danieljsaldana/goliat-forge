# service

Private Fargate API, separate migration task and CPU autoscaling.

API privada Fargate, tarea de migración separada y escalado por CPU.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `key_relay_arn` | Yes / Sí | Only this Cognito public-key helper may be invoked by the API. |
| `database_driver` | No | Application database adapter: postgres, mysql or documentdb. |
| `worker_role_arn` | No | Optional worker IAM role ARN mapped into DocumentDB; empty when events are disabled. |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `region` | Yes / Sí | AWS region of the workload and its service endpoints. |
| `image` | Yes / Sí | Immutable ECR image URI with @sha256 digest. |
| `ecr_arn` | Yes / Sí | Installation ECR repository ARN used by the execution role. |
| `subnets` | Yes / Sí | Private workload subnet IDs in two availability zones. |
| `security_group` | Yes / Sí | Security group ID restricting this workload or database. |
| `target_group_arn` | Yes / Sí | Private ALB target group ARN used to register the API tasks. |
| `environment` | Yes / Sí | Non-secret environment variables. Database access uses task/function IAM roles. |
| `database_resource_ids` | Yes / Sí | SQL database resource IDs allowed by rds-db:connect; empty for DocumentDB IAM mapping. |
| `admin_secret_arn` | Yes / Sí | AWS-managed administrator secret ARN; available only to the migration role. |
| `database_kms_arn` | Yes / Sí | Secret CMK ARN for SQL; null for the AWS-managed DocumentDB secret key. |
| `queue_arn` | Yes / Sí | Only this SQS queue may receive API messages; null disables publishing permissions. |
| `cpu` | Yes / Sí | Fargate CPU units (1024 units = 1 vCPU). Must match memory. |
| `memory` | Yes / Sí | Fargate task memory in MiB. Must match the selected CPU tier. |
| `replicas` | Yes / Sí | Minimum and desired API task count when activated. |
| `max_replicas` | Yes / Sí | Maximum API tasks allowed by CPU target tracking. |
| `autoscaling` | No | CPU target and scale-in/out cooldown seconds. Replica bounds are separate. |
| `active` | Yes / Sí | Enable workloads only after the private database migration succeeds. |
| `retention` | Yes / Sí | CloudWatch log retention in whole days. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `cluster`: ECS cluster name for service deployment and migration.
- `service`: ECS API service name.
- `migration_task`: Private administrator migration task definition ARN.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
