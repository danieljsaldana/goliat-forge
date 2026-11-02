# network

Private network, subnet routing, security groups and AWS endpoints.

Red privada, subredes, rutas, grupos de seguridad y endpoints AWS.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `database_port` | No | Only this selected database TCP port is permitted from API and worker security groups. |
| `events_enabled` | No | Add the SQS interface endpoint when the optional business event module is enabled. |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `region` | Yes / Sí | AWS region of the workload and its service endpoints. |
| `cidr` | Yes / Sí | Canonical private IPv4 CIDR /16–/19; fixed subnet offsets preserve resource addresses. |
| `endpoint_az_count` | Yes / Sí | Place interface endpoints in one (lower cost) or two (higher availability) AZs. |
| `nat_enabled` | Yes / Sí | Optional single-AZ NAT and API-only general HTTPS egress. Disabled by default. |
| `retention` | Yes / Sí | CloudWatch log retention in whole days. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `vpc_id`: Workload VPC ID.
- `app_subnets`: Private application subnet IDs, in availability-zone order.
- `data_subnets`: Isolated database subnet IDs, in availability-zone order.
- `alb_sg`: Ingress security group for the internal ALB.
- `app_sg`: Security group for API and private migration tasks.
- `worker_sg`: Security group for the optional event worker.
- `database_sg`: Database security group, restricted to the selected port.
- `availability_zones`: Two workload availability zones used for stable reader placement.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
