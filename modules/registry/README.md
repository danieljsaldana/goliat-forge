# registry

Shared immutable ECR repository for application images.

Repositorio ECR compartido e inmutable para las imágenes de aplicación.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `url`: Shared ECR repository URI; append an immutable digest for deployment.
- `arn`: Shared ECR repository ARN for scoped pull permissions.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
