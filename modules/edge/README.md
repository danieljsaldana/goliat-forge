# edge

CloudFront, private S3 frontend and internal ALB.

CloudFront, frontend en S3 privado y ALB interno.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `frontend_script_hashes` | No | Exact Next.js inline-script CSP hashes produced by the frontend build. |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `vpc_id` | Yes / Sí | Workload VPC ID containing the private ALB. |
| `subnets` | Yes / Sí | Private workload subnet IDs in two availability zones. |
| `alb_sg` | Yes / Sí | ALB security group permitting CloudFront origin-facing traffic only. |
| `waf_arn` | Yes / Sí | Global WAF Web ACL ARN shared by environment CloudFront distributions. |
| `region` | Yes / Sí | AWS region of the workload and its service endpoints. |
| `protect` | Yes / Sí | Enable deletion protection; disable explicitly before reviewed teardown. |
| `portals` | Yes / Sí | Map of URL paths to sample labels and requester/operator views; backend authorization remains mandatory. |
| `domain_name` | Yes / Sí | Optional DNS hostname for HTTPS; null uses the generated CloudFront hostname for Dev/demo. |
| `certificate_arn` | Yes / Sí | Validated ACM certificate ARN in us-east-1; supplied together with domain_name. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `url`: Public HTTPS application origin.
- `bucket`: Private frontend bucket name for source publication.
- `distribution_id`: CloudFront distribution ID used for asset invalidations.
- `target_group_arn`: Private API target group ARN for Fargate registration.
- `listener_arn`: ALB listener ARN and service startup dependency.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
