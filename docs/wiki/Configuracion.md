# Configuración

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Configuration)

## Empieza por las plantillas comentadas

`./forge configure --name myforge --region eu-west-1 --config .local/config` prepara una configuración local. `myforge` es un nombre de ejemplo. La autenticación AWS se selecciona fuera de los tfvars mediante SSO o un rol federado.

| Plantilla pública | Uso |
| --- | --- |
| [environments/common.tfvars](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/common.tfvars) | Identidad de instalación, región, etiquetas, presupuesto y logs |
| [common.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/common.auto.tfvars.example) | Todas las opciones públicas de `common`, incluido el límite WAF |
| [dev.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/dev.auto.tfvars.example) | Todas las opciones públicas del entorno Dev |
| [prod.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/prod.auto.tfvars.example) | Todas las opciones públicas del entorno Prod |
| [examples/demo](https://github.com/danieljsaldana/goliat-forge/tree/main/examples/demo) | Instalación de evaluación con configuración propia |
| [local.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/local.auto.tfvars.example) | Overrides internos avanzados, inactivos y comentados |

Los archivos generados se mantienen en `.local/config`, ignorado por Git. Para activar un override, copia su `.example` a un archivo sin ese sufijo y edítalo. Por ejemplo:

```sh
cp .local/config/dev.auto.tfvars.example .local/config/dev.auto.tfvars
```

## Orden y sustitución de objetos

El CLI carga `common.tfvars` → `common.auto.tfvars` → `<entorno>.tfvars` → runtime generado → `local.auto.tfvars` → `<entorno>.auto.tfvars`. Pasa esos archivos explícitamente a Terraform: no basta con dejar un archivo en cualquier carpeta.

**Cada objeto se sustituye completo.** Copia la plantilla completa de `environment` o `common`; no escribas un objeto parcial esperando una combinación profunda. Los campos opcionales omitidos usan sus valores predeterminados de Terraform.

Conserva el nombre y la región elegidos con `configure`. El CLI verifica la identidad efectiva en el plan y que el nombre del entorno coincida con su estado. Otra región o identidad requiere preparar otra instalación y planificar una migración.

## Qué puedes ajustar

| Área | Opciones principales |
| --- | --- |
| Red | CIDR RFC1918 canónico entre /16 y /19, endpoints en una o dos AZ y NAT opcional |
| API | CPU/memoria ARM64 compatibles, réplicas mínimas/deseadas, máximo y objetivo/cooldowns de autoscaling |
| Datos | Uno de cuatro perfiles, versión, clase, lectores de clúster, AZ, backups, protección y snapshot final |
| Identidad y web | MFA, dominio/certificado y mapa `portals` con vistas `requester`/`operator` |
| Eventos | Activación SQS/worker, memoria, timeout, lote, concurrencia, reintentos, retención y recuperación |
| Plataforma | Etiquetas, límite WAF, presupuesto mensual, destinatarios y retención de logs |

Los portales son ejemplos reutilizables; añadir claves al mapa crea rutas adicionales a esas vistas. No genera otra aplicación de negocio.

`platform`, `api_image`, `worker_archive`, `frontend_script_hashes` y `activate_workloads` los coordina el CLI. No los sustituyas para un despliegue normal. Los tfvars no contienen contraseñas ni claves AWS. Las plantillas cubren las entradas públicas del producto; modificar cualquier atributo AWS interno requiere adaptar su módulo.

[Referencia completa y límites](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/configuration.md) · [Bases de datos](https://github.com/danieljsaldana/goliat-forge/wiki/Bases-de-datos-e-IAM)
