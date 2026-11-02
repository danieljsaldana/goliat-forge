# Aplicación de ejemplo

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Example-application)

## Luma: una petición recorre la arquitectura

La aplicación de referencia permite crear solicitudes y ver su estado. Sirve para comprobar integración, autorización y procesamiento; los portales no son un producto de negocio terminado.

| Pieza | Implementación y función |
| --- | --- |
| Frontend | Next.js con exportación estática a S3 privado, servido por CloudFront |
| Backend | Node.js en Fargate privado; autenticación y operaciones de solicitudes |
| Identidad | Cognito con Authorization Code + PKCE y validación de JWT en la API |
| Datos | Adaptador del perfil PostgreSQL, Aurora o DocumentDB elegido |
| Worker opcional | Lambda dentro de la VPC, SQS y DLQ para actividades asíncronas |

El mapa `portals` define inicialmente `tenant` (vista `requester`) y `admin` (vista `operator`). Puedes añadir rutas reutilizando ambas vistas. El nombre o la visibilidad de una ruta no concede permisos: el backend comprueba identidad, propiedad y grupo `Operators`.

## Flujo sin eventos

1. El usuario inicia sesión y recibe un token de corta duración.
2. El frontend llama a `/api` por CloudFront y WAF.
3. La API valida el token y guarda la solicitud en la base privada.
4. El usuario consulta sus solicitudes; un operador puede revisar las de todos.

Con `events_enabled = false` no se crea outbox ni se espera al worker. Es el perfil inicial para una web y una API sencillas.

## Flujo con SQS

Con eventos activos, la solicitud y su evento de outbox se guardan en la misma transacción. La publicación en SQS lleva el trabajo al worker, que registra la actividad y el resultado de forma idempotente. Un timer recupera eventos pendientes; la DLQ recibe mensajes que agotan los intentos. No se promete entrega exactamente una vez: SQS puede repetir entregas.

El frontend conserva el mismo UUID al reintentar una respuesta perdida. Mismo identificador y contenido devuelve el resultado existente; cambiar el contenido devuelve conflicto. La idempotencia no sustituye el control de propiedad de la solicitud.

## Tres formas de probar

| Modo | Qué demuestra |
| --- | --- |
| Laboratorio del sitio de producto | Explicación visual y datos en memoria; no prueba seguridad AWS |
| `npm run demo` | Frontend Next.js y API reales en localhost, sin autenticación AWS y con operador ficticio |
| `./forge ... deploy --environment demo` | Recursos AWS facturables, Cognito, IAM, redes y datos reales |

En local, `EVENTS_ENABLED=true npm run demo` simula el procesamiento asíncrono; no conecta a SQS. Los datos en memoria desaparecen al parar el proceso. Usa dos usuarios reales y un operador para validar aislamiento y permisos en AWS.

[Flujos y aceptación](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/workflows.md) · [Referencia de la aplicación](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/reference.md)
