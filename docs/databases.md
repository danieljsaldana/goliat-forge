# Motores de datos, roles y réplicas

[English](databases.en.md) · [Goliat Forge](../README.es.md)

Elige **un motor por entorno** con `environment.db_kind`. El CLI conecta el adaptador Node.js, el puerto privado, la migración y los permisos. Dev y Prod pueden elegir motores diferentes, pero el producto no convierte ni sincroniza sus datos.

| Perfil | Motor / puerto | Autenticación de la aplicación | Disponibilidad y lectura |
| --- | --- | --- | --- |
| `postgres` | RDS PostgreSQL / 5432 | Tokens IAM, usuario SQL con `rds_iam` | Multi-AZ opcional con standby no legible |
| `aurora-postgresql` | Aurora PostgreSQL / 5432 | Tokens IAM, usuarios separados | Escritor + mapa de lectores y prioridades de promoción |
| `aurora-mysql` | Aurora compatible con MySQL / 3306 | Tokens IAM mediante `AWSAuthenticationPlugin` | Escritor + mapa de lectores y prioridades de promoción |
| `documentdb` | DocumentDB 5.0 / 27017 | `MONGODB-AWS` con ARN de rol y usuarios en `$external` | Escritor + lectores; roles por colección |

## Configuración

Los [ejemplos completos](../examples/databases/README.md) son overrides de Dev. Tras `./forge configure`, copia el que necesites como `.local/config/dev.auto.tfvars`. Mantén `common.tfvars` de tu instalación. El objeto `environment` se reemplaza completo; Terraform no combina parcialmente los mapas.

```hcl
# Dentro de environment. Fragmento, no un archivo tfvars completo.
db_kind           = "aurora-postgresql"
db_instance_class = "db.r6g.large"
db_engine_version = null

db_multi_az = true

db_read_replicas = {
  reader-a = {
    instance_class = "db.r6g.large"
    promotion_tier = 1
  }
  reader-b = {
    instance_class = "db.r6g.large"
    promotion_tier = 2
  }
}
```

`db_instance_class` controla el escritor; cada lector puede elegir otra clase. Las claves del mapa son estables: renombrarlas sustituye instancias. Un número menor de `promotion_tier` tiene preferencia de promoción (0–15); no controla el reparto de consultas. Se admiten hasta cinco lectores en esta edición, como límite del producto, no como cuota universal de AWS. No se incluye autoescalado del número de lectores.

Con `db_multi_az = true`, los perfiles de clúster exigen al menos un lector y lo colocan en otra AZ. Sin lectores sigue existiendo almacenamiento redundante gestionado por AWS, pero no un segundo cómputo listo para failover. En RDS, Multi-AZ crea un standby que no acepta consultas.

**Límite de RDS:** AWS no permite crear réplicas de lectura PostgreSQL cuando el origen gestiona el secreto maestro en Secrets Manager. Por eso `postgres` exige `db_read_replicas = {}`; para lectores con este modelo de secretos, elige Aurora PostgreSQL. No se cambia a una contraseña manual como atajo. [Restricción de AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html).

## Versiones y almacenamiento

Con `db_engine_version = null`, RDS usa la familia 17; Aurora resuelve una versión regional dentro de PostgreSQL 17 o MySQL 8.4; DocumentDB usa 5.0.0 para conservar IAM identity authentication. Fija una versión completa de Aurora tras evaluarla para controlar las actualizaciones. La selección regional no prueba disponibilidad de todas las clases: comprueba cuotas, versión y región antes de aplicar. No se realizan upgrades mayores automáticos.

`db_storage_gb` solo controla RDS y su límite de crecimiento (3 veces el valor inicial). Aurora y DocumentDB gestionan su almacenamiento de clúster; ese valor no limita su factura. Los perfiles de clúster son provisionados, con `db.r6g.large` por defecto si omites la clase. Cada escritor, lector y standby genera coste. [Costes](costs.md).

## Roles en vez de contraseñas de aplicación

API, worker y migración tienen roles distintos. En SQL, IAM permite `rds-db:connect` únicamente sobre el ID del recurso y el usuario correspondiente. Aurora necesita el **ID del clúster**, no el de una instancia. La migración crea usuarios SQL con permisos limitados. MySQL obtiene un token nuevo al abrir cada conexión física, mediante su plugin de autenticación, y exige TLS validado.

DocumentDB vincula los ARN IAM de API y worker con usuarios de `$external`. La autorización se define con roles de base de datos por colección; no existe aquí una política ficticia `docdb:connect`. El driver obtiene las credenciales temporales del rol de Fargate/Lambda y usa `MONGODB-AWS`. El usuario de API no puede actualizar solicitudes ni borrar colecciones. En DocumentDB, el permiso `update` del worker se limita por colección, no por campo; en SQL se limita a la columna `status`.

No hay passwords en tfvars ni `DB_PASSWORD`. **El administrador inicial sí tiene un secreto:** RDS/Aurora/DocumentDB lo generan, guardan y rotan en Secrets Manager. Solo la tarea de migración puede leer ese ARN. No se crea `secret_version` con su contenido en Terraform. RDS/Aurora cifran ese secreto con la CMK del módulo; el proveedor DocumentDB utilizado permite gestión nativa y usa la clave gestionada de Secrets Manager para el secreto, con una CMK independiente para los datos. No se afirma que el administrador carezca de credencial.

## Lecturas, consistencia y SQS

La aplicación usa el endpoint escritor para leer y escribir, preservando la lectura inmediata tras crear una solicitud. Los endpoints de lectura se publican en `installation.database.readers`; se reservan para consultas que acepten retraso de replicación. El producto no dirige automáticamente las solicitudes a ellos. El endpoint lector de un clúster sin lectores puede dirigir tráfico al escritor; por eso la salida del producto queda vacía si no configuras lectores.

SQS continúa siendo opcional con cualquier motor. Los tres adaptadores mantienen el contrato de solicitudes, autorización por propietario, reintentos idempotentes y outbox transaccional. El cliente DocumentDB utiliza transacciones sin consistencia causal y desactiva retryable writes para el perfil 5.0. Las colecciones e índices se crean antes de servir tráfico.

## Compatibilidad y cambios

DocumentDB no es el servidor MongoDB. Tiene compatibilidad parcial con su API y diferencias de índices, transacciones y comandos. El ejemplo usa un subconjunto probado localmente, pero una app MongoDB existente necesita validar sus consultas y características. [IAM de DocumentDB](https://docs.aws.amazon.com/documentdb/latest/devguide/iam-identity-auth.html), [transacciones](https://docs.aws.amazon.com/documentdb/latest/devguide/transactions.html), [IAM de Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html).

Cambiar `db_kind` en una instalación con datos **no migra los datos**: cambia los recursos que Terraform administra. Conserva protección de borrado, crea una instalación de destino, exporta/importa con herramientas del motor, valida permisos y datos, y realiza el cambio de tráfico con un plan de vuelta atrás. Las pruebas con PostgreSQL, MySQL y MongoDB locales verifican el contrato y los permisos; no equivalen a una aceptación real de Aurora/DocumentDB o de IAM en AWS.

Cada lector también admite availability_zone (una AZ de las subredes del entorno). Sin override, el placement es estable: la segunda AZ si exiges Multi-AZ, la primera en caso contrario. Añadir otra clave al mapa no mueve las existentes. Multi-AZ rechaza lectores colocados todos en la AZ del escritor.
