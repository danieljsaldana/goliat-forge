# Operación y recuperación

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Operations)

## Saber qué está desplegado

```sh
./forge --profile platform status --config .local/config --environment dev
./forge --profile platform plan --config .local/config --environment dev
```

`platform` y `myforge` son ejemplos. `status` permite localizar URLs y recursos. Revisa el plan antes de aplicar cambios y conserva el directorio de bootstrap. Un plan necesita backend, servicios compartidos y artefactos previos; para una instalación inicial usa el flujo `deploy` de [inicio rápido](https://github.com/danieljsaldana/goliat-forge/wiki/Inicio-rapido).

CloudWatch recoge logs de aplicación, migración, funciones, WAF y flujos de VPC. El ALB guarda accesos en S3. Investiga por identificador de solicitud y hora; evita tokens, cookies, contraseñas o contenido sensible en logs e issues.

## Reintentos y eventos

Si se pierde una respuesta al crear una solicitud, conserva el UUID y el mismo contenido al reintentar. Un identificador nuevo puede crear otra solicitud.

Si activaste eventos, revisa outbox, cola, ejecuciones del worker, recuperación y DLQ. Corrige la causa antes del redrive; el consumidor admite duplicados mediante idempotencia. No borres filas o mensajes para ocultar fallos. La alarma de DLQ es una métrica/alarma de CloudWatch: conecta los canales de aviso que necesite tu equipo.

## Restaurar antes de necesitarlo

Define RPO y RTO. Restaura un backup en una instancia o clúster nuevo y comprueba endpoint, certificado, roles IAM, permisos internos, esquema, propiedad de las solicitudes y reanudación del procesamiento. Actualiza configuración y despliegue de forma controlada. Multi-AZ mejora disponibilidad; no sustituye un backup ni demuestra que la restauración funcione.

## Retirar un entorno

1. Revisa datos, backups, dependencias y el plan. El borrado es destructivo.
2. Si existe protección, cambia `deletion_protection = false` en el objeto completo del entorno y **aplica ese cambio con un despliegue normal** antes de destruir.
3. Define `skip_final_snapshot` y, si corresponde, un `db_final_snapshot_identifier` nuevo. El nombre predeterminado puede existir de un borrado anterior.
4. Ejecuta el borrado con el nombre real de instalación:

```sh
./forge --profile platform destroy --config .local/config --environment dev --confirm myforge --yes
```

Se aplica el mismo plan de destrucción guardado. Buckets con versiones o contenido, imágenes ECR y protecciones pueden bloquearlo. No se purgan automáticamente: revisa y retira únicamente los datos que hayas decidido eliminar.

Para retirar también los servicios compartidos, usa `--environment all --destroy-shared` una vez vacíos todos los estados de entornos. El backend S3 protegido se conserva con su bootstrap. No borres archivos de estado para forzar una destrucción. Su retirada definitiva necesita revisión aparte y conservación de los estados.

[Guía operativa](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/operations.md) · [Costes residuales](https://github.com/danieljsaldana/goliat-forge/wiki/Costes)
