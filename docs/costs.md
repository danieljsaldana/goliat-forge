# Costes y capacidad

[English](costs.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

Esta instalación no es gratuita ni escala completamente a cero. No hay una estimación universal: depende de región, disponibilidad, tráfico, logs y consumo. Antes de desplegar, compón una estimación con [AWS Pricing Calculator](https://calculator.aws/) y los recursos del catálogo.

## Base encendida

Por entorno se factura ALB, RDS con su almacenamiento/backups, tareas Fargate y endpoints de interfaz. Dev usa seis interfaces en una AZ y Prod seis en dos AZ: el número de endpoints y sus horas importa aunque no haya peticiones. S3 gateway no es un endpoint de interfaz. KMS, WAF, CloudFront, logs y transferencias tienen sus propios conceptos. No se añade NAT por defecto; activarla introduce otra base horaria y procesamiento de datos.

## Lo que se comparte

ECR, la Web ACL y el backend de estado no se duplican entre Dev y Prod. Cada entorno mantiene sus propias cargas y datos. No se prometen porcentajes de ahorro. El presupuesto de instalación utiliza Installation: activa esta etiqueta como cost allocation tag en Billing y espera su disponibilidad. Una alerta no detiene ECS, RDS ni ningún otro recurso.

## Demo, Dev y Prod

La demo local en memoria no consume AWS. La demo Terraform sí. Dev conserva una única réplica de API y RDS sin Multi-AZ; Prod aumenta réplicas, disponibilidad y backups. Las instancias PostgreSQL IAM necesitan memoria adicional para autenticar: db.t4g.small es una base de desarrollo, no una capacidad validada para cualquier carga. Ajusta conexiones, métricas y pruebas de carga antes de reducirla o aumentarla.

Al destruir, pueden permanecer snapshots, versiones de S3, imágenes, el backend protegido y claves KMS en su periodo de borrado. Revisa el inventario y Billing; destruir el estado de un entorno no significa coste cero en la cuenta.

Fuentes: [Fargate](https://aws.amazon.com/fargate/pricing/), [ALB](https://aws.amazon.com/elasticloadbalancing/pricing/), [RDS](https://aws.amazon.com/rds/postgresql/pricing/), [PrivateLink](https://aws.amazon.com/privatelink/pricing/), [WAF](https://aws.amazon.com/waf/pricing/), [memoria de IAM DB auth](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html). Revisadas para el diseño el 2 de noviembre de 2026; consulta las tarifas vigentes al desplegar.
