# Operación y recuperación

[English](operations.en.md) · [Goliat Forge](../README.es.md)


## Diagnóstico

Consulta status para URL, pool, clúster y servicio. CloudWatch conserva logs de API/migración, funciones, WAF y VPC flow logs. El ALB escribe accesos en S3 con retención de 90 días. No registres tokens, contraseñas, headers Authorization ni payloads de solicitudes. Los logs WAF redactan Authorization, Cookie y query strings.

En una respuesta perdida, reintenta con el mismo UUID y contenido; no generes otro identificador si no sabes si se confirmó la persistencia. En una cola interrumpida revisa forge.outbox y la ejecución del timer, sin editar filas para ocultar errores. En DLQ, corrige la causa antes del redrive: la idempotencia del worker permite entregar otra vez.

## Recuperación de datos

Prueba restaurar RDS a una instancia nueva y reconectar la aplicación; tener backups no demuestra que puedas restaurar. Verifica usuarios IAM, certificados, endpoint, esquema, propiedad de solicitudes y procesamiento posterior. Define RPO/RTO según tu negocio. El perfil Multi-AZ no sustituye una restauración ni es una réplica de lectura. Exporta los resultados de tus pruebas de aceptación fuera de Git si contienen metadatos reales.

## Destruir

```
./forge --profile platform destroy --config .local/config --environment dev --confirm myforge --yes
```

El comando genera un plan de destrucción guardado y aplica ese mismo plan. Las protecciones de base de datos, ALB y Cognito y los buckets no vacíos pueden bloquearlo intencionadamente. Revisa backups, desactiva deletion_protection mediante un plan normal y define la política de snapshot antes de repetir. El nombre final de snapshot es <instalación>-<entorno>-final: configura un `db_final_snapshot_identifier` nuevo si ya existe un snapshot con ese nombre. No se purgan automáticamente versiones, contenido ni imágenes.

Para retirar shared, usa --environment all --destroy-shared, una vez vacíos todos los estados de entornos. ECR no se fuerza a borrar imágenes. El backend S3 tiene prevent_destroy y se conserva, junto con su bootstrap local. Su retiro definitivo requiere una revisión separada y la conservación/exportación de todos los estados. No borres archivos de estado para forzar un teardown.

## Aceptación antes de producción

Valida un despliegue AWS real en tu región, cuotas de CloudFront/Fargate/Lambda/RDS, DNS/ACM, usuarios y MFA, rechazo de tokens incorrectos, autorización entre dos usuarios, denegación del ALB desde Internet, acceso S3 fuera de CloudFront, TLS de RDS, recuperación de cola/DLQ y restauración. Ejecuta pruebas de carga y revisa el presupuesto. Si necesitas TLS en todos los saltos o controles regulatorios, adapta esa capa antes de aceptar la base.
