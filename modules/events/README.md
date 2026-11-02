# events

Optional SQS, DLQ, VPC-connected worker and outbox recovery.

SQS, DLQ, worker en VPC y recuperación del outbox, opcionales.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `database_driver` | No | Application database adapter: postgres, mysql or documentdb. |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `region` | Yes / Sí | AWS region of the workload and its service endpoints. |
| `archive` | Yes / Sí | Absolute path to the locally packaged, versioned Lambda source archive. |
| `subnets` | Yes / Sí | Private workload subnet IDs in two availability zones. |
| `security_group` | Yes / Sí | Security group ID restricting this workload or database. |
| `database_resource_ids` | Yes / Sí | SQL database resource IDs allowed by rds-db:connect; empty for DocumentDB IAM mapping. |
| `environment` | Yes / Sí | Non-secret environment variables. Database access uses task/function IAM roles. |
| `retention` | Yes / Sí | CloudWatch log retention in whole days. |
| `active` | Yes / Sí | Enable workloads only after the private database migration succeeds. |
| `settings` | No | Bounded worker, queue, retry and recovery settings; SQS visibility is derived as six times worker timeout. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `queue_url`: Source queue URL for IAM-authenticated publishing.
- `queue_arn`: Source queue ARN for scoped IAM and Lambda polling.
- `dlq_url`: Dead-letter queue URL for reviewed operations.
- `worker_role_arn`: Worker role ARN used for DocumentDB IAM mapping.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
