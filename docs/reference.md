# Luma: frontend, API y funciones

[English](reference.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

## Frontend Next.js

apps/web es una aplicación React con Next.js (Pages Router) y output: export. npm run setup:web instala su lockfile; npm run build:web produce apps/web/out/. S3 privado conserva los archivos y CloudFront los sirve. No hay servidor Next.js, SSR, rutas API Next ni secretos en NEXT_PUBLIC_*. La API Node.js vive en Fargate.

Los dos portales son vistas del mismo frontend: requester para crear y consultar solicitudes propias, operator para la vista de equipo. El mapa portals permite más rutas a esas vistas; no genera aplicaciones distintas. El backend valida Operators para el acceso global, aunque se abra una URL administrativa.

La autenticación usa Authorization Code + PKCE y state de un solo uso. El navegador conserva únicamente el access token y su vencimiento en sessionStorage; descarta el refresh token. No contiene un client secret. El token expira a los 15 minutos y requiere volver al login. El cierre de sesión borra la copia local y sale del login Cognito; un JWT emitido conserva su validez hasta expirar.

El build calcula hashes SHA-256 exactos de los scripts inline exportados. El CLI los incorpora a la política CSP de CloudFront; no se habilitan unsafe-inline ni unsafe-eval para JavaScript. No despliegues un frontend recompilado sin actualizar también sus hashes.

## Modo básico y SQS opcional

Con events_enabled = false (valor inicial), POST guarda directamente en PostgreSQL y devuelve 201, o 200 si ya existía el mismo ID y contenido. No se crea outbox ni se publica en SQS. El frontend muestra Guardada y oculta actividad y métricas del worker.

Con events_enabled = true, la API guarda solicitud y outbox juntos; devuelve 202 para una nueva solicitud y muestra su entrega. Terraform añade SQS, DLQ, endpoint SQS, worker Lambda y recuperación. La interfaz muestra el procesamiento asíncrono. Cambiar el modo no reprocesa las solicitudes creadas sin eventos. Desactivar eventos con mensajes pendientes exige revisar la cola y el outbox.

npm run demo usa el modo básico local. EVENTS_ENABLED=true npm run demo activa la simulación del worker en memoria: no crea una cola AWS.

## API Node.js

GET /api/me identifica al usuario. GET /api/requests y /api/activities filtran por propietario, salvo Operators. GET /api/requests/<uuid> aplica la misma regla. POST /api/requests valida título/detalle y un UUID v4 generado por el cliente. Si una respuesta se pierde, reenviar el mismo ID y contenido devuelve la solicitud previa. Cambiar el contenido con el mismo ID produce conflicto. El backend nunca acepta la identidad enviada en el cuerpo ni convierte la vista admin en un permiso.

El contenedor usa usuario sin privilegios y filesystem de solo lectura. El usuario forge_api tiene SELECT/INSERT sobre solicitudes, lectura de actividad y permisos para el outbox; no puede modificar el estado de procesamiento ni borrar tablas. PostgreSQL se conecta con tokens IAM obtenidos por conexión y TLS con CA de RDS. No se usa el usuario maestro para servir peticiones.

## Worker y outbox

La solicitud y su evento se guardan juntos. Si SQS falla después, la respuesta confirma que la solicitud está guardada y la entrega queda pendiente. Un timer de cinco minutos procesa hasta 100 filas pendientes; adapta lote y frecuencia a tu volumen. La cola entrega al menos una vez. El worker usa transacción, bloqueo de fila y clave única de actividad para evitar duplicados. Los fallos parciales se notifican por messageId. Tras cinco entregas fallidas, SQS mueve el mensaje a una DLQ, retenida 14 días. La alarma de DLQ aparece en CloudWatch; esta base no conecta automáticamente un canal de aviso externo.

La Lambda de claves de identidad es otra función: no procesa negocio ni tiene acceso a datos. Recupera las claves públicas de Cognito y solo puede ser invocada por roles autorizados. Se mantiene fuera de la VPC para obtener esas claves; no tiene Function URL.

## Migración

Una tarea Fargate independiente recupera el secreto maestro de Secrets Manager, crea el esquema y asigna usuarios SQL de permisos limitados. El rol de API no puede leer ese secreto. La tarea se ejecuta en la VPC sin SSH, bastión ni acceso PostgreSQL desde GitHub o tu Mac. Los cambios futuros de esquema deben seguir una política de migraciones versionadas y compatibilidad; la migración incluida crea idempotentemente el esquema inicial.


## Demo de la web del producto

La web ofrece una vista independiente de la lógica de dominio en el navegador. El modo Web + API no crea outbox. El modo SQS simula entrega fallida, recuperación y eventos duplicados. Los usuarios A y B ven registros separados; el operador puede consultar ambos. Cambiar de modo o pulsar Reiniciar vacía los datos ficticios en memoria. No ejecuta el export Next.js real ni demuestra por sí sola permisos IAM o controles de red; `npm run demo` ejecuta la aplicación Next.js y Node.js real en local.

El objeto `environment.events` configura timeout, memoria, reintentos, retención y frecuencia de recuperación. Los cinco minutos y cinco recepciones descritos antes son valores iniciales. La alarma de DLQ en CloudWatch no conecta automáticamente un canal de aviso externo.
