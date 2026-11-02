# Terraform: módulos y garantías de configuración

[English](terraform.en.md) · [Configuración](configuration.md) · [Producto](product.md)

Goliat Forge tiene tres pilas: `state` crea el backend, `shared` reúne los recursos comunes y `environment` compone las cargas de Dev, Prod o una demo independiente. Cada entorno tiene su propio estado, VPC, datos, identidad y aplicación. Compartir ECR y WAF no conecta las VPC entre sí.

## Responsabilidades

| Módulo | Responsabilidad | Consumo |
| --- | --- | --- |
| state | S3/KMS, versionado y bloqueo del estado | Bootstrap |
| registry | ECR inmutable y limpieza de imágenes sin tag | Compartido |
| waf | Web ACL, reglas gestionadas, límite por IP y logs ocultando cabeceras sensibles | Compartido |
| observability | Presupuesto por etiqueta de instalación | Compartido |
| network | Subredes de aplicación y datos, SG, rutas, endpoints y flow logs | Por entorno |
| edge | S3 privado, CloudFront, OAC y ALB interno | Por entorno |
| identity | Cognito y función auxiliar de claves públicas | Por entorno |
| database | Un perfil: PostgreSQL, Aurora PostgreSQL/MySQL o DocumentDB | Por entorno |
| service | API Fargate, rol de aplicación, migración y escalado | Por entorno |
| events | SQS, DLQ, worker y recuperación de outbox | Opcional por entorno |

Cada módulo contiene `variables.tf` con tipos y descripciones, `outputs.tf` con su contrato de salida, código de recursos y un README bilingüe. Los proveedores y las etiquetas se configuran en las pilas raíz. Los cambios de organización de archivos no alteran las direcciones de recursos de Terraform. Los lectores usan claves estables de mapa; `primary` está reservado para el escritor.

## Qué configura el usuario

Las plantillas completas `common.auto.tfvars.example`, `dev.auto.tfvars.example`, `prod.auto.tfvars.example` y `demo.auto.tfvars.example` contienen todas las entradas públicas. El CLI prepara el runtime y mantiene valores reales en directorios ignorados por Git. La configuración de credenciales usa AWS SSO o federación y queda fuera de los tfvars.

Las pruebas comparan los campos públicos y los objetos anidados con las plantillas. También verifican el orden de los overrides. Un archivo auto no se carga por estar en una carpeta cualquiera: el CLI lo pasa explícitamente desde `--config`. Los objetos completos se sustituyen; no hay mezcla profunda.

No todos los atributos de AWS son opciones del producto. Las políticas IAM, la topología de subredes, el TLS interno de los orígenes, las ventanas de mantenimiento y el esquema de la aplicación son decisiones de código. Adaptarlas requiere revisar los módulos y la aplicación.

## Comprobaciones reproducibles

```sh
make check
make test
make terraform-test
make site-check
```

Las pruebas Terraform usan proveedores simulados y no crean recursos en AWS. Cubren acceso privado, WAF/OAC, secretos de administrador separados, protección de borrado, motores y lectores, capacidades válidas y coherencia entre timeout SQS y worker. CI también prueba los contratos de datos con PostgreSQL, MySQL y MongoDB de prueba, sin usar una cuenta AWS.

`terraform validate` y los mocks no comprueban cuotas, disponibilidad regional de clases de instancia, compatibilidad de un certificado o permisos de una cuenta real. Antes de producción revisa el plan real, restaura un backup de prueba y valida los endpoints con usuarios de permisos distintos.

## Límites a tener presentes

- Una pila de entorno selecciona un motor, no despliega los cuatro a la vez. Cambiarlo requiere migrar datos; revisa cualquier destrucción del plan.
- La aplicación consulta al escritor. Los endpoints de lectura quedan disponibles para una evolución de la aplicación.
- Terraform reconcilia `desired_count` con `replicas` al aplicar, aunque el autoscaler haya aumentado el número de tareas.
- La salida NAT opcional usa una sola AZ. El WAF inspecciona entrada HTTP de CloudFront, no SQL, eventos, salida NAT ni el login gestionado de Cognito.
- CloudFront → ALB → API utiliza HTTP en red privada. El perfil no implementa mTLS entre servicios; la base de datos sí exige TLS validado.
- El nombre del snapshot final debe ser único si repites una instalación y su borrado. Usa `db_final_snapshot_identifier` cuando ya exista el nombre predeterminado.
- El bootstrap conserva deliberadamente el backend de estado y no purga S3/ECR ni backups automáticamente.
