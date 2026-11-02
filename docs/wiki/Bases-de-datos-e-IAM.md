# Bases de datos e IAM

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Databases-and-IAM)

## Elige un perfil por entorno

| `db_kind` | Servicio | Identidad de aplicación | Lectores |
| --- | --- | --- | --- |
| `postgres` | RDS PostgreSQL, familia inicial 17 | Token IAM y usuario con `rds_iam`; TLS validado | No; Multi-AZ es un standby de disponibilidad |
| `aurora-postgresql` | Aurora PostgreSQL, familia inicial 17 | Token IAM y usuario con `rds_iam`; TLS validado | Mapa de instancias lectoras |
| `aurora-mysql` | Aurora MySQL, familia inicial 8.4 | Token IAM y `AWSAuthenticationPlugin`; TLS validado | Mapa de instancias lectoras |
| `documentdb` | Amazon DocumentDB 5.0 | `MONGODB-AWS`, roles IAM registrados en `$external`; TLS validado | Mapa de instancias lectoras |

DocumentDB ofrece compatibilidad parcial con la API MongoDB; no es un servidor MongoDB idéntico. Comprueba las operaciones e índices que necesita tu aplicación. El perfil de ejemplo usa un adaptador distinto para cada familia.

## Sin contraseñas de aplicación en tfvars

Fargate y el worker asumen roles IAM. Los adaptadores SQL generan un token al abrir una conexión física; DocumentDB usa las credenciales temporales del rol. Los permisos IAM y los permisos internos de la base de datos actúan juntos.

AWS administra el secreto del usuario maestro en Secrets Manager. Solo la tarea privada de migración puede leerlo para preparar esquema y usuarios; la API y el worker no reciben acceso al secreto maestro. No hay `DB_PASSWORD` que rellenar ni access keys permanentes para la aplicación. Esto no elimina el secreto administrativo: cambia quién lo gestiona y quién puede usarlo.

## Instancias y réplicas

`db_read_replicas` es un mapa con claves estables, hasta cinco lectores como límite del producto. `primary` está reservado. Cada lector permite `instance_class`, `promotion_tier` (0–15) y `availability_zone` dentro de las dos AZ del entorno.

Para Aurora/DocumentDB, `db_multi_az = true` exige al menos un lector en otra AZ. No basta con activar el booleano. En RDS PostgreSQL, la combinación de secreto maestro administrado del producto no admite réplicas de lectura: usa Aurora si necesitas ese patrón.

**La aplicación de ejemplo lee y escribe en el writer.** Los endpoints de lectura se exponen como outputs; añadir lectores no distribuye automáticamente sus consultas. No se incluye autoscaling del número de lectores.

## Capacidad, versiones y recuperación

`db_storage_gb` y `db_max_storage_gb` se aplican a RDS PostgreSQL. El almacenamiento de clústeres Aurora/DocumentDB lo administra AWS. Copia el [ejemplo del motor](https://github.com/danieljsaldana/goliat-forge/tree/main/examples/databases) para elegir una clase compatible; no reutilices `db.t4g.small` para Aurora sin revisarlo.

La versión regional y las clases disponibles deben validarse en tu cuenta. Cambiar `db_kind` no convierte datos ni migra esquemas: requiere un plan de migración, backups y una revisión de los reemplazos Terraform. Prueba la restauración y conserva una política explícita de snapshot final.

[Referencia detallada](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/databases.md) · [Operación](https://github.com/danieljsaldana/goliat-forge/wiki/Operacion)
