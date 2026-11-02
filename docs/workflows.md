# GitHub: validación y publicación

[English](workflows.en.md) · [Goliat Forge](../README.es.md)

## Flujos incluidos

| Flujo | Cuándo | Permisos y resultado |
| --- | --- | --- |
| Validate product | PR, main y manual | Lectura de código; tests de API, JWT, PostgreSQL/MySQL/MongoDB, TFLint, Terraform simulado, Next.js y web |
| Publish product website | Cambios en la web/documentación en main o manual | Artefacto estático y despliegue en el entorno github-pages; no usa AWS |
| Refresh public GitHub stars | Diario o manual | Solo metadatos públicos en github-stats/stars.json; no recompila Pages |
| CodeQL | PR, main y semanal | Análisis de JavaScript, Python y workflows; publica resultados de seguridad |
| Dependabot | Semanal | Propuestas para SDK, Next/React, Terraform, Docker y Actions |

Actions está fijado por SHA, los runners usan ubuntu-24.04 y los checkouts no conservan credenciales. Las PR no reciben claves AWS. La integración SQL usa una base desechable con credenciales de prueba; nunca consulta la cuenta AWS.

Validate product ejecuta la suite en Node 24 y 26. En Node 26 también construye la imagen Alpine de producción y prueba API, identidad y adaptadores dentro del contenedor, sin acceso de red externo ni credenciales AWS.

## Configurar el repositorio

En tu fork, activa Pages con GitHub Actions, alertas de Dependabot, detección de secretos y protección de main. Requiere los checks `checks (24)` y `checks (26)` de Validate product y revisión antes del merge; bloquea pushes forzados y borrados. Activa Discussions si quieres separar preguntas de incidencias. El sitio deriva el enlace real a GitHub y su URL de Pages durante el build. No se inventan repositorios ni estrellas en local.

La primera ejecución de estrellas crea una rama de datos con un único stars.json. El cliente consulta ese JSON público al volver a la pestaña y cada minuto; una instantánea caducada no se presenta como reciente. El cron no garantiza actualización inmediata y GitHub puede pausar schedules de repositorios inactivos.

## Despliegue AWS

Los workflows incluidos no despliegan infraestructura ni consumen AWS. El CLI local usa SSO. Para automatizar después, configura un rol federado OIDC restringido al repositorio y entorno, un GitHub Environment con revisores y un backend existente; nunca guardes access keys permanentes.

En un runner efímero, usa ./forge configure y ./forge use-backend con el bucket regional y la clave KMS de estado existentes antes de ./forge deploy. Los planes se generan y aplican en ese mismo job; no los publiques como artefactos públicos. El estado de bootstrap de la primera instalación necesita una copia segura fuera del repositorio. Define permisos del operador ajustados a tu cuenta y revisa la confianza OIDC antes de habilitar automatización facturable.
