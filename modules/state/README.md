# state

Encrypted, versioned S3 Terraform backend with native lock files.

Backend Terraform S3 cifrado y versionado con bloqueo nativo.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `bucket` | Yes / Sí | Globally unique private Terraform state bucket name. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `bucket`: Encrypted and versioned state bucket name.
- `kms_arn`: State encryption key ARN for backend configuration.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
