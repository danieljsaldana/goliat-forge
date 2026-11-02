# Seguridad

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Security)

## Defensa por capas

Forge combina entrada web protegida, aislamiento de red, autenticación y autorización. Es una base que debes validar para tu caso; no garantiza seguridad absoluta ni cumplimiento normativo.

| Recorrido | Control principal |
| --- | --- |
| Navegador → web/API | HTTPS en CloudFront y Web ACL WAF compartida |
| CloudFront → contenido | Bucket S3 privado y Origin Access Control |
| CloudFront → backend | VPC origin y ALB interno; Fargate sin IP pública |
| API/worker → base | Security groups, puerto del motor, IAM, permisos de datos y TLS validado |
| Aplicación → servicios AWS | Roles temporales y endpoints privados, según el servicio |
| Administración | SSO/rol del operador y permisos de control de AWS |

**Todo el tráfico no pasa por WAF.** WAF inspecciona las peticiones HTTP de las distribuciones; no inspecciona conexiones de base de datos, SQS o el plano de control AWS. Cognito tiene su propio servicio de inicio de sesión. No hay un firewall central de salida incluido. Activar NAT permite salida HTTPS adicional de la API y requiere revisar destinos y coste.

## Red privada y cifrado

La base no tiene acceso público. Las tareas y el worker de negocio están en subredes privadas. Los endpoints privados permiten usar servicios AWS sin una ruta general de salida a Internet; S3 usa un gateway endpoint.

La entrada del navegador es HTTPS. Los saltos privados CloudFront → ALB → API usan **HTTP** en esta versión: no hay TLS extremo a extremo ni mTLS. Si tu política exige cifrado en todos los saltos, adapta listeners, certificados y servicios antes de aceptar el diseño.

La Lambda auxiliar de claves públicas de Cognito está fuera de la VPC, sin Function URL ni permisos de datos. No es el worker privado de negocio. La API la invoca mediante IAM para verificar claves; no publica una API adicional en Internet.

## Identidad y privilegios

Cognito usa Authorization Code + PKCE, tokens de corta duración y grupo `Operators`. El perfil Prod activa MFA por defecto. La API verifica tokens, propiedad y permisos, incluso si el usuario conoce una URL interna. Separa los roles de ejecución, aplicación, migración y worker.

La SPA guarda el access token en `sessionStorage`; CSP y controles XSS siguen siendo necesarios. No hay BFF ni sesión con cookie HttpOnly. Cerrar sesión limpia la sesión del cliente, pero un JWT emitido puede seguir siendo válido hasta que expire.

AWS administra el secreto maestro de datos. Solo la migración privada lo lee; la API y el worker usan IAM. Nunca publiques credenciales, `.env`, auto.tfvars locales, estados, planes, bootstrap ni logs con tokens. Un `.gitignore` no revoca un secreto que ya se haya expuesto.

## Antes de publicar tu instalación

Prueba acceso entre dos usuarios, privilegios de operador, MFA, rechazo de tokens incorrectos, denegación de S3 directo y acceso público al ALB, restauración y permisos del motor elegido. Revisa drift, dependencias y alarmas de forma continua.

[Detalle técnico](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/security.md) · [Comunicar una vulnerabilidad](https://github.com/danieljsaldana/goliat-forge/blob/main/SECURITY.md) · [Preparación para producción](https://github.com/danieljsaldana/goliat-forge/wiki/Produccion-y-problemas)
