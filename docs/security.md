# Seguridad y secretos

[English](security.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

El producto separa acceso público, red de aplicación, datos y permisos de cada proceso. No ofrece una garantía absoluta de seguridad ni sustituye los controles de tu organización. La autorización se comprueba en la API; WAF y red privada no hacen innecesario validar identidad.

## Credenciales

Terraform utiliza tu sesión AWS SSO o credenciales temporales de rol. No crea access keys permanentes. RDS genera y conserva el secreto maestro en Secrets Manager, cifrado con KMS. Terraform solo conserva sus metadatos. La tarea de migración tiene GetSecretValue sobre ese ARN concreto y Decrypt restringido al servicio. La API y el worker no pueden leer el secreto maestro: usan rds-db:connect sobre sus usuarios concretos.

ECS separa rol de ejecución (pull/logs), rol de aplicación y rol de migración. Lambda separa worker de negocio y auxiliar de claves. El wildcard de ecr:GetAuthorizationToken es requerido por esa API; los pulls se limitan al repositorio. Las acciones EC2 de interfaces del worker VPC requieren Resource:* por la integración Lambda; no significan acceso administrativo general a EC2. No se conceden permisos EFS ni acceso global a Secrets Manager.

## Datos en Git y navegador

El scanner de publicación revisa claves AWS, claves privadas, nombres de archivos reales, ZIP, estados, planes y metadatos de cuentas no ficticias. .local/, .forge/, .env y *.auto.tfvars reales están ignorados. Un .gitignore no limpia un secreto ya versionado: revócalo, investiga el historial y elimina la exposición. El bundle RDS .crt contiene certificados públicos, no claves privadas.

config.json contiene IDs públicos de Cognito y rutas, no secretos. La SPA conserva access tokens solo en sessionStorage y necesita protegerse frente a XSS. CSP, escape de texto de React y ausencia de scripts de terceros reducen superficie; no equivalen a cookies HttpOnly. Para un producto de mayor riesgo, considera un BFF y gestión central de sesiones.

## Límites importantes

El certificado generado de CloudFront queda para evaluación. Prod requiere ACM y dominio para política TLS moderna. Los saltos internos HTTP no son mTLS; consulta arquitectura. Cognito login y la obtención de sus claves públicas son servicios gestionados fuera del recorrido HTTP del WAF de la aplicación. La Lambda auxiliar no tiene endpoint público ni permisos de datos. Cambiar un SG, rol, listener o distribución fuera de Terraform puede romper estas propiedades; revisa drift y cambios con planes.

Las pruebas automáticas comprueban contratos y escenarios, pero no demuestran ausencia de vulnerabilidades ni sustituyen pruebas de aceptación en AWS.
