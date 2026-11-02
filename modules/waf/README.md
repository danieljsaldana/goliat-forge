# waf

Shared managed web rules, rate limiting and redacted logs.

Reglas web gestionadas, límite por IP y logs con campos ocultos, compartidos.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `retention` | Yes / Sí | CloudWatch log retention in whole days. |
| `rate_limit` | No | Shared per-IP request limit over the explicit five-minute evaluation window. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `arn`: Shared global Web ACL ARN associated with environment CloudFront distributions.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
