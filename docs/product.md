# Goliat Forge · Funcionamiento

[English](product.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

Goliat Forge es una base modular de aplicaciones para AWS. Reúne Terraform, configuración comentada, una herramienta de despliegue y Luma, una aplicación de referencia con frontend Next.js, API Node.js y PostgreSQL, con procesamiento SQS/Lambda opcional. El código de aplicación se puede sustituir; no es un generador de aplicaciones de negocio.

## Qué comparte la instalación

ECR almacena una imagen inmutable que consumen los entornos. Una Web ACL global aplica las mismas reglas a sus distribuciones CloudFront. El estado reside en S3 cifrado con KMS, versionado y bloqueo nativo. AWS Budgets observa el coste etiquetado de la instalación. Compartir estos componentes evita duplicarlos; no elimina los costes propios de cada entorno.

## Qué pertenece a Dev y Prod

Cada entorno tiene VPC, subredes de aplicación y datos, security groups, endpoints AWS, frontend S3, ALB interno, CloudFront, Cognito, Fargate, RDS y sus identidades. Si los eventos están habilitados, también tiene SQS, DLQ, un worker Lambda conectado a la VPC y un timer de recuperación. No hay peering entre los entornos. Esta edición utiliza una cuenta AWS y una región de cargas; WAF global se gestiona en us-east-1. La separación en cuentas AWS independientes requiere adaptar permisos y estados.

## Qué hace Luma

Un usuario autenticado registra solicitudes y consulta las suyas. Un miembro del grupo Cognito Operators puede consultar todas. En modo básico, la API guarda la solicitud directamente en PostgreSQL. Si activas SQS, escribe también el outbox en la misma transacción. Después intenta publicar en SQS. El worker confirma una actividad y actualiza el estado en otra transacción. Una repetición del evento no crea otra actividad. No incluye aprobaciones, pagos, correo de negocio ni reglas sectoriales.

Los portales tenant y admin son dos vistas estáticas del mismo ejemplo, servidas desde el mismo bucket. Añadir una entrada al mapa portals crea otra ruta a una vista existente; no crea una aplicación distinta ni duplica contenedores.

## Tres formas de explorar

- La web del producto contiene un laboratorio en memoria dentro del navegador, sin AWS.
- npm run demo sirve Luma y una API en memoria exclusivamente en 127.0.0.1. Los datos desaparecen al detener el proceso.
- El perfil demo de Terraform es una instalación AWS real, aislada por nombre y estado, que genera costes. No cambia RDS por memoria ni desactiva Cognito.

Esta base se verifica con pruebas locales, PostgreSQL 17 y proveedores Terraform simulados. Una prueba con recursos reales de AWS y los criterios de aceptación de producción siguen siendo necesarios para cada instalación. No se afirma que esta copia esté desplegada o certificada para producción.

## Empezar con lo sencillo

El frontend de referencia es Next.js con export estático. El flujo inicial es frontend → API Node.js privada → PostgreSQL privado. SQS es una extensión opcional. Activa events_enabled cuando necesites trabajo asíncrono; no es un requisito para una web normal.
