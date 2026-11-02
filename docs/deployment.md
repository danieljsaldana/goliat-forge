# Preparar y desplegar

[English](deployment.en.md) · [Goliat Forge](../README.es.md)


## Requisitos

Terraform >=1.10 y <2; Python >=3.11 en macOS/Linux; Node.js >=24 y npm; AWS CLI v2 con una sesión SSO o un rol federado; Docker con motor Linux y Buildx para linux/arm64. Debes poder gestionar los recursos, IAM/PassRole, el rol vinculado de CloudFront VPC origins, KMS y el backend. No se crean usuarios IAM ni claves permanentes. Las autorizaciones del operador no son las de las tareas de aplicación.

```
npm ci
./forge check
npm test
npm run demo
```

La demo local abre http://127.0.0.1:4080. Detén ese proceso antes de repetirlo en el mismo puerto. La web del producto se prepara con make site-serve.

## Tu primera instalación AWS

```
aws sso login --profile platform
./forge configure --name myforge --region eu-west-1 --config .local/config
# Edita .local/config/common.tfvars y dev.tfvars.
./forge --profile platform deploy --config .local/config --environment dev --yes
```

El comando configura primero el backend con un estado de bootstrap local conservado, aplica shared, publica una imagen ARM64 en ECR y obtiene su digest. Compila el export Next.js y sus hashes CSP, empaqueta las funciones desde el código fuente, aplica Dev inactivo la primera vez, ejecuta una tarea Fargate de migración dentro de la VPC y activa API, autoscaling y los eventos que hayas habilitado. Publica el frontend sin sobrescribir config.json y espera a que ECS esté estable. Cada aplicación utiliza un plan guardado; las dependencias requieren varios planes secuenciales.

Docker recibe la contraseña temporal de ECR por stdin y utiliza un directorio de credenciales temporal eliminado al terminar. Los planes, metadatos, estado de bootstrap y archivos de ejecución residen en .forge/. Conserva una copia segura del bootstrap para operar el backend.

## Prod

Edita prod.tfvars: el perfil incluye dos réplicas, endpoints en dos AZ, RDS Multi-AZ, backups de 14 días, protección contra borrado y MFA obligatorio. Debes configurar domain_name y certificate_arn, validado en ACM us-east-1. Publica su DNS hacia CloudFront. A continuación usa el mismo comando con --environment prod. --environment all coordina Dev y Prod, pero no convierte sus estados en uno.

## Usuarios

Con el user_pool_id mostrado por status, crea el usuario mediante Cognito y añade a Operators solo a los operadores que necesiten ver todas las solicitudes. La creación de usuarios está restringida al administrador. No hay contraseñas por defecto ni identidades de negocio creadas automáticamente. Configura la entrega de correo y cuotas de Cognito antes de invitar a usuarios reales.

```
./forge --profile platform status --config .local/config --environment dev
./forge --profile platform plan --config .local/config --environment dev
```

plan requiere que shared y el artefacto de imagen ya existan. No crea recursos: produce planes guardados para revisar. Bootstrap y la primera publicación resuelven las dependencias antes del plan del entorno. Una ejecución interrumpida conserva los planes y el ARN de la última migración para su diagnóstico. Revisa CloudWatch y vuelve a ejecutar; no borres el estado para resolver errores.

El frontend publica primero los chunks Next.js con nombre por hash y caché inmutable. Después publica HTML y archivos públicos, conserva config.json y solicita invalidación. No borra chunks antiguos durante el despliegue: conservan compatibilidad con navegadores que aún usan HTML anterior. Programa su limpieza solo tras una ventana de recuperación definida.
