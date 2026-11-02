# Módulos Terraform

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Terraform-modules)

## Tres pilas, estados separados

| Pila | Responsabilidad |
| --- | --- |
| [state](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/state) | Bootstrap del backend S3 con KMS, versionado y bloqueo mediante lockfile |
| [shared](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/shared) | Registro ECR, política WAF global y presupuesto de la instalación |
| [environment](https://github.com/danieljsaldana/goliat-forge/tree/main/stacks/environment) | Instancia independiente para Dev, Prod o demo: red, identidad, web, API, datos y eventos opcionales |

Compartir servicios no mezcla estados ni bases de datos. El CLI conserva los outputs compartidos y coordina el orden de despliegue. `--environment all` opera los entornos por etapas; no los convierte en un único plan o estado.

## Diez módulos con contratos propios

| Módulo | Qué aporta |
| --- | --- |
| [state](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/state) | Bucket de estado, cifrado y protección del backend |
| [registry](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/registry) | Repositorio ECR e imágenes inmutables |
| [waf](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/waf) | Web ACL global, reglas administradas y límite por IP |
| [observability](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/observability) | Presupuesto de instalación y avisos de presupuesto configurables |
| [network](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/network) | VPC, subredes de aplicación/datos, rutas, endpoints y flujo de red |
| [edge](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/edge) | CloudFront, S3 privado/OAC, ALB interno y VPC origin |
| [identity](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/identity) | Cognito, grupo Operators y verificador auxiliar de claves públicas |
| [database](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/database) | Perfil de base de datos, roles IAM, backups y lectores compatibles |
| [service](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/service) | Fargate, roles de ejecución/aplicación/migración y autoscaling |
| [events](https://github.com/danieljsaldana/goliat-forge/tree/main/modules/events) | SQS, DLQ, worker Lambda privado, recuperación y alarma de DLQ |

Cada módulo tiene `variables.tf`, `outputs.tf`, restricciones de proveedor y README. La composición vive en las pilas; la aplicación no usa direcciones internas de recursos como interfaz pública.

## Cómo ampliar la base

Añade entradas con validación y descripción, salidas estables y documentación en ambos idiomas. Si expones una nueva opción pública, actualiza los `.auto.tfvars.example` correspondientes. Separa reglas y permisos por función, revisa el plan y conserva direcciones Terraform cuando reorganices archivos; un cambio de nombre puede recrear infraestructura sin una migración de estado.

El CLI aplica el plan guardado de cada etapa. No ejecutes simultáneamente dos despliegues con los mismos archivos o estado. Los bloqueos reducen carreras; no sustituyen la revisión de cambios.

## Calidad y límites de las comprobaciones

`make check`, `make test` y `make terraform-test` comprueban configuración, CLI, aplicación y contratos Terraform. CI añade TFLint, análisis de código y pruebas con bases de datos desechables. Las pruebas Terraform usan proveedores simulados: no verifican cuotas, compatibilidad regional, disponibilidad de clases ni una instalación AWS real.

[Contratos y calidad](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/terraform.md) · [Contribuciones](https://github.com/danieljsaldana/goliat-forge/wiki/Desarrollo-y-contribuciones)
