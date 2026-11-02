# identity

Cognito authorization-code/PKCE identity and IAM-only public-key helper.

Identidad Cognito con código/PKCE y auxiliar de claves públicas invocable por IAM.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `archive` | Yes / Sí | Absolute path to the locally packaged, versioned Lambda source archive. |
| `retention` | Yes / Sí | CloudWatch log retention in whole days. |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `url` | Yes / Sí | Public application origin used for Cognito callback and logout URLs. |
| `mfa` | Yes / Sí | Require Cognito TOTP MFA when true; optional enrollment otherwise. |
| `protect` | No | Protect the user pool from deletion together with the environment data. |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `key_relay_arn`: IAM-invoked Cognito public-key helper function ARN.
- `pool_id`: Cognito user pool ID for JWT issuer validation.
- `client_id`: Public browser app client ID; this client has no secret.
- `domain_prefix`: Managed Cognito login domain prefix.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
