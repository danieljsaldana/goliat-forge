# Producción y problemas

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Production-and-troubleshooting)

## Pasar de ejemplo a proyecto real

El perfil Prod endurece la configuración, pero no sustituye una revisión de arquitectura y operación. Antes de aceptar la instalación:

- Configura dominio propio, DNS y certificado ACM validado en `us-east-1`. Prod lo exige para aplicar una política TLS moderna; el hostname gratuito de CloudFront queda para Dev/demo.
- Comprueba cuotas y disponibilidad regional de Fargate ARM64, CloudFront VPC origins, Lambda y el motor/clase de datos elegidos.
- Prueba con dos usuarios y un operador: aislamiento de solicitudes, permisos, expiración de tokens, MFA y rechazos de acceso.
- Valida que S3, ALB y base no se puedan utilizar directamente desde Internet; prueba las rutas permitidas, no solo la página de inicio.
- Ejecuta carga, failover cuando corresponda, restauración de backups y, si usas eventos, recuperación de outbox y DLQ.
- Define guardias, destinatarios de alertas, retención, RPO/RTO y un procedimiento de actualización y retirada.

Dev y Prod pertenecen a una cuenta y región de cargas. No hay Organizations, separación multi-cuenta ni recuperación multi-región integrada. Las subredes de dos AZ no convierten automáticamente todas las dependencias en altamente disponibles: revisa tareas, endpoints, base y el NAT opcional de una sola AZ.

Los saltos privados HTTP, la SPA con tokens en `sessionStorage` y la ausencia de un firewall central de salida son decisiones de esta base. Amplíalas si tu política requiere TLS en todos los saltos, un BFF, inspección de salida o controles de cumplimiento adicionales.

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| `plan` no encuentra outputs o artefactos | Completa el bootstrap/deploy inicial; `plan` no crea la instalación entera desde cero |
| El CLI rechaza identidad o entorno | Mantén `common.name`/`region` de `configure` y el nombre del estado elegido; no cambies Dev por Prod dentro del objeto |
| Error de certificado en Prod | Región `us-east-1`, validación, cobertura del hostname y DNS que apunte a la distribución correcta |
| Fargate no descarga imagen o no arranca | Digest ARM64, ECR, endpoints, security groups, logs y resultado de migración antes de activar tareas |
| IAM de base de datos devuelve acceso denegado | Motor, usuario/rol interno, ARN/recurso de conexión, rol de tarea, reloj y CA TLS; no desactives la validación |
| La configuración de lectores falla | RDS no acepta lectores en este producto; en clústeres usa claves válidas, clase compatible y otra AZ si activas Multi-AZ |
| La web abre pero una acción no funciona | Respuesta `/api`, JWT/grupo/propiedad y coincidencia de frontend/config/CSP; no publiques tokens para depurar |
| Una solicitud queda pendiente con eventos | Outbox, publicación SQS, worker, timer de recuperación y DLQ; reintenta la petición con su mismo UUID |
| `destroy` está bloqueado | Protección ya aplicada a false, política/snapshot final único, contenido/versiones S3 e imágenes ECR |

El pipeline prueba adaptadores contra PostgreSQL, MySQL y MongoDB desechables; eso no acredita todas las diferencias de Aurora o DocumentDB. La aceptación final exige pruebas reales en tu cuenta y región.

[Seguridad](https://github.com/danieljsaldana/goliat-forge/wiki/Seguridad) · [Despliegue](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/deployment.md) · [Abrir incidencia](https://github.com/danieljsaldana/goliat-forge/issues/new/choose)
