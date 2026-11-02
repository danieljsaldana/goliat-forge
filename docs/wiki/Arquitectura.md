# Arquitectura AWS

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Architecture)

La arquitectura es la base del producto. Luma aporta un recorrido que puedes ejecutar para comprobar las piezas antes de sustituir la aplicación.

## Qué se comparte y qué se separa

| Compartido por instalación | Propio de cada entorno |
| --- | --- |
| ECR e imágenes por digest | VPC y dos AZ con subredes de aplicación y datos |
| Una Web ACL global WAF | CloudFront, frontend S3 privado y ALB interno |
| Backend de estado S3/KMS, con estados separados | API Fargate, Cognito y base de datos |
| Presupuesto por etiqueta de instalación | SQS, DLQ y worker si habilitas eventos |

Dev y Prod no tienen peering. Compartir WAF, imágenes y estado no conecta sus VPC ni mezcla datos. El perfil demo se configura como instalación independiente.

## Entrada y aplicación

```text
Navegador → HTTPS → CloudFront + WAF
                        ├─ web estática → S3 privado mediante OAC
                        └─ /api/* → VPC origin → ALB interno → API Fargate
                                                               └─ IAM + TLS → datos privados
```

Cada entorno tiene su distribución. El WAF inspecciona entrada HTTP de web/API; la base de datos no es accesible directamente desde Internet. El backend valida JWT y permisos por propietario.

Cognito ofrece el login gestionado por AWS. Una función auxiliar obtiene solo sus claves públicas y permite que la API las consulte por el endpoint privado de Lambda. Esa función no está conectada a la VPC y no tiene Function URL ni permisos sobre datos de negocio. El worker opcional sí está conectado a la VPC.

## Red y límites

- Dos subredes de aplicación y dos de datos en dos AZ. Las tareas no reciben IP pública.
- Cinco endpoints de interfaz por defecto: ECR API/DKR, logs, Secrets Manager y Lambda. SQS añade el sexto si se habilita. S3 usa un endpoint gateway.
- Dev/demo colocan endpoints de interfaz en una AZ; Prod en dos. Un Internet Gateway adjunto es necesario para VPC origins, aunque las cargas no tengan ruta pública.
- NAT está desactivada por defecto. La opción incluida añade una NAT en una AZ y salida HTTPS de la API; el WAF no inspecciona esa salida.
- Navegador → CloudFront usa HTTPS; CloudFront → ALB → API usa HTTP privado. No se incluye mTLS de servicio. La conexión de base de datos exige TLS validado.

[Diagrama de arquitectura](https://danieljsaldana.github.io/goliat-forge/diagrams/overview.html) · [Red y seguridad](https://danieljsaldana.github.io/goliat-forge/diagrams/network.html) · [Referencia de arquitectura](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/architecture.md) · [Seguridad](https://github.com/danieljsaldana/goliat-forge/wiki/Seguridad)
