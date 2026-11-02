# observability

Installation budget filtered by its cost allocation tag.

Presupuesto de instalación filtrado por su etiqueta de coste.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `amount` | Yes / Sí | Monthly installation budget in USD; alerts do not stop resources. |
| `emails` | Yes / Sí | Optional budget notification recipients; no more than ten addresses. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `budget_name`: Installation budget name; cost-tag activation is required for attribution.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
