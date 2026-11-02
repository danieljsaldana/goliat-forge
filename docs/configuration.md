# Variables, tfvars y modularidad

[English](configuration.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

## Archivos

| Archivo | Función |
| --- | --- |
| environments/common.tfvars | Nombre, región, etiquetas, presupuesto y retención compartidos |
| environments/dev.tfvars | Capacidad y comportamiento de Dev |
| environments/prod.tfvars | Capacidad y protección de Prod |
| examples/demo/ | Instalación de evaluación independiente |
| environments/*.auto.tfvars.example | Plantillas HCL para overrides locales documentados |
| .local/config/<entorno>.auto.tfvars | Override del usuario, ignorado por Git y pasado al final por el CLI |
| .forge/.../runtime/<entorno>.auto.tfvars.json | Digest, outputs compartidos y archivo Lambda generado por el CLI |

Los .tfvars HCL admiten comentarios; los .auto.tfvars.json generados no. Terraform no combina profundamente objetos: sustituir environment o common exige un objeto completo con sus campos obligatorios. No pongas AWS keys, tokens, contraseñas ni credenciales de base de datos en ninguno. El archivo backend.json conserva configuración y cuenta, no claves de acceso.

## common

name identifica la instalación y no debe cambiarse para una actualización normal. region elige la región de las cargas, no la región global de WAF. tags se agregan a los recursos; Installation y Product mantienen la trazabilidad. monthly_budget_usd es un umbral de aviso, alert_emails está vacío por defecto y log_retention_days debe ser uno de los valores permitidos por CloudWatch.

## environment

name separa el estado. vpc_cidr se divide en subredes; usa rangos privados sin solapamientos previstos. endpoint_az_count vale 1 o 2. nat_enabled es false por defecto. cpu y memory deben ser una pareja Fargate válida; replicas y max_replicas deben ser enteros coherentes. El autoscaler usa CPU objetivo 60%; la siguiente aplicación de Terraform reconcilia la capacidad deseada al valor configurado.

db_instance_class, db_storage_gb y db_engine_version controlan RDS. La familia es PostgreSQL 17; no cambies a otra versión mayor sin modificar el parámetro group y planificar una migración. db_multi_az no crea una réplica de lectura utilizable por la aplicación. db_backup_days, deletion_protection y skip_final_snapshot gobiernan recuperación y borrado. mfa_required controla TOTP.

domain_name y certificate_arn se configuran juntos. En Prod son obligatorios; el certificado debe estar validado en us-east-1 y cubrir el hostname. El producto no compra dominios ni crea DNS público automáticamente.

portals es un mapa label/view. Las vistas disponibles son requester y operator. Puedes añadir una clave como partners sin nuevas variables enable_web_*. api, callback y config están reservados. La identidad y autorización se validan en el backend, no en el nombre de la ruta.

## Desactivar eventos

events_enabled quita los recursos del worker de negocio, la cola y la DLQ. La Lambda auxiliar de claves Cognito sigue siendo necesaria para autenticación. Las solicitudes se conservan en PostgreSQL; no se activa un procesamiento en memoria en AWS. Está desactivado por defecto: las solicitudes nuevas no generan outbox ni esperan al worker. Al habilitarlo, las nuevas solicitudes usan outbox; las anteriores no se reprocesan automáticamente. Revisa el impacto antes de destruir una cola que contenga mensajes.

## Valores internos

platform, api_image, worker_archive, frontend_script_hashes y activate_workloads se calculan o coordinan por el CLI. Los digests son inmutables y del ECR de la instalación. El archivo de funciones se construye localmente; no se versionan ZIP. La activación inicial ocurre después de la migración. Los templates de overrides no son secretos ni configuraciones reales de una cuenta.

El CLI carga local.auto.tfvars después de los valores internos y, a continuación, el override del entorno (dev.auto.tfvars o prod.auto.tfvars). Los archivos no se detectan por estar en cualquier carpeta: deben estar en el directorio --config.

## Auto.tfvars completos y orden de carga

`./forge configure` copia las plantillas comentadas al directorio de configuración. Activa únicamente las que necesites quitando `.example`:

| Archivo local | Alcance |
| --- | --- |
| `common.auto.tfvars` | Todas las opciones de `common`: nombre/región de la instalación, etiquetas, presupuesto, destinatarios y retención |
| `dev.auto.tfvars` / `prod.auto.tfvars` | Todas las opciones públicas de `environment`, incluidos motor, lectores, tamaño, AZ/prioridad, portales, SQS, MFA y dominio |
| `local.auto.tfvars` | Overrides internos avanzados: imagen, outputs compartidos, archivo de funciones, hashes CSP y activación. Todo aparece comentado por defecto |

El orden efectivo es `common.tfvars` → `common.auto.tfvars` → `<entorno>.tfvars` → runtime generado por el CLI → `local.auto.tfvars` → `<entorno>.auto.tfvars`. El override compartido también se aplica a la pila shared. Cada objeto se reemplaza completo; usa las plantillas completas. Conserva el nombre y la región elegidos con `configure`: para otra identidad o región prepara una instalación nueva y una migración.

La cuenta AWS, SSO y los permisos del operador se seleccionan fuera de tfvars; las contraseñas de administrador las gestiona AWS. El perfil demo dispone de su propia plantilla. Las pruebas comparan los campos públicos Terraform con las plantillas para detectar opciones sin documentar.

Estas plantillas cubren **las entradas públicas del producto**. Detalles internos como reglas WAF, intervalos de health check, TLS entre servicios o políticas IAM concretas se mantienen en sus módulos: cambiar cualquier atributo AWS arbitrario requiere adaptar código y revisar su seguridad. Los parámetros internos generados no son credenciales.
