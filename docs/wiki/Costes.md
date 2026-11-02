# Costes y capacidad

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Costs)

## Estima antes de desplegar

El despliegue AWS es facturable y no escala completamente a cero. No existe un importe universal: región, motor, disponibilidad, tráfico y retención cambian el total. Usa [AWS Pricing Calculator](https://calculator.aws/) con tu configuración antes de ejecutar `deploy`.

| Partida | Qué revisar |
| --- | --- |
| API | Horas de Fargate, CPU/memoria por tarea y número de réplicas |
| Entrada | ALB por entorno, capacidad procesada, CloudFront y WAF |
| Datos | Motor, clase, almacenamiento, I/O según modalidad, lectores, standby y backups |
| Endpoints | Cinco endpoints de interfaz por entorno por defecto; seis con eventos/SQS. Cada servicio se despliega en una o dos AZ según configuración |
| Operación | S3, KMS, ECR, logs y transferencia entre AZ/servicios |
| Opcionales | NAT, Lambda, SQS, alarmas y recursos retenidos tras un borrado |

El endpoint gateway de S3 es distinto de los endpoints de interfaz. Una sola AZ para las interfaces reduce su base horaria, pero puede introducir tráfico entre AZ y menor tolerancia a fallos. No presupongas disponibilidad gratuita.

## Qué se comparte y qué se mantiene separado

ECR, la política WAF, el presupuesto y el backend de estado pertenecen a la instalación. Dev y Prod conservan VPC, ALB, distribución, identidad, tareas y datos propios. Esto evita duplicar algunos servicios; no elimina el coste de las cargas ni garantiza un porcentaje de ahorro.

El NAT está desactivado por defecto. Activarlo incorpora coste horario y procesamiento; el NAT opcional es de una sola AZ. PostgreSQL RDS Multi-AZ añade un standby, mientras que Aurora/DocumentDB añaden lectores según el mapa. Ninguno equivale a réplicas gratuitas.

## Presupuesto y capacidad

`monthly_budget_usd` define un umbral y `alert_emails` sus destinatarios. Activa la etiqueta `Installation` como cost allocation tag en Billing para que el filtro del presupuesto pueda utilizarla; su disponibilidad no es inmediata. El presupuesto **no detiene recursos**.

Dimensiona conexiones, memoria de autenticación IAM, tareas, límite de CPU y concurrencia Lambda con pruebas de carga. La aplicación usa el writer aunque existan lectores. Terraform vuelve a reconciliar la capacidad deseada de la API al valor `replicas` al aplicar; considera este comportamiento al coordinar escalado y despliegues.

## Demo y recursos que permanecen

La demo local y el laboratorio visual no crean AWS. La demo Terraform sí genera costes. Tras destruir pueden permanecer snapshots, versiones de S3, ECR, backend y claves durante su periodo de retirada. Revisa inventario y Billing; un estado vacío no significa que el gasto de toda la cuenta sea cero.

[Configuración](https://github.com/danieljsaldana/goliat-forge/wiki/Configuracion) · [Operación](https://github.com/danieljsaldana/goliat-forge/wiki/Operacion) · [Precios AWS](https://aws.amazon.com/pricing/)
