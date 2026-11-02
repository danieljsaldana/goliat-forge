# Arquitectura, redes y límites

[English](architecture.en.md) · [Goliat Forge](../README.es.md)

Las referencias a PostgreSQL describen el perfil inicial. También puedes elegir Aurora PostgreSQL/MySQL o DocumentDB 5.0. Consulta [motores, roles IAM y réplicas](databases.md) para puertos, adaptadores, permisos y límites.

## Una entrada para la aplicación

El navegador accede por HTTPS a CloudFront. El WAF compartido evalúa el tráfico HTTP. Los archivos del frontend proceden de S3 privado mediante Origin Access Control. /api/* no se cachea y conserva Authorization mediante AllViewerExceptHostHeader. CloudFront conecta al ALB interno mediante VPC origins; el ALB reenvía a Fargate. No se publica una segunda API por API Gateway ni un NLB paralelo.

## La VPC

Cada entorno reserva dos subredes de aplicación y dos de datos en dos zonas de disponibilidad. Los contenedores no reciben IP pública. El ALB acepta el prefijo gestionado de origen de CloudFront, y la API acepta únicamente el SG del ALB. PostgreSQL permite 5432 solo desde los SG de API y worker. La subred de datos no tiene ruta NAT.

Un Internet Gateway debe estar adjunto porque CloudFront VPC origins lo exige; en el modo predeterminado no se crea una ruta a Internet para las cargas. ECR API/DKR, logs, Secrets Manager y Lambda usan cinco endpoints de interfaz. SQS añade el sexto únicamente al activar eventos. S3 usa un endpoint gateway. Dev/demo ubican interfaces en una AZ; Prod en dos. Comprueba regiones/AZ compatibles y el peso del prefijo de CloudFront frente a tus cuotas de security groups.

## Identidad sin salida general de la API

La API verifica los JWT con aws-jwt-verify. Al necesitar una clave pública o detectar una rotación, invoca una Lambda auxiliar por el endpoint privado de Lambda. Esta función no tiene URL pública, no está conectada a la VPC y carece de acceso a RDS, colas o secretos: solo obtiene las claves públicas del pool Cognito configurado. Las claves se cachean en el verificador de cada contenedor. El login de Cognito es un servicio público gestionado por AWS; no pasa por el WAF de la aplicación.

## Cifrado: límites explícitos

Navegador → CloudFront usa HTTPS. CloudFront → ALB y ALB → API usan HTTP sobre el camino privado. PostgreSQL exige TLS y el cliente valida la cadena RDS. Las llamadas a las APIs AWS usan HTTPS y roles IAM. Esta base no implementa mTLS ni cifrado TLS en todos los saltos internos. Si tu política exige TLS extremo a extremo, incorpora certificados de origen y TLS de servicio antes de aceptar producción.

El hostname gratuito de CloudFront utiliza la política TLSv1 que fija AWS. Prod exige dominio propio y certificado ACM de us-east-1 para usar TLSv1.2_2021. El certificado no configura DNS: crea el alias/CNAME de tu dominio a la distribución.

## Qué no atraviesa el WAF

Conexiones SQL, mensajes SQS, invocaciones Lambda, pulls de ECR y acceso al estado usan sus propios controles de red e IAM. El WAF no es un firewall de salida. nat_enabled agrega una salida HTTPS general para la API; es una decisión explícita, genera costes y no inspecciona ese tráfico con el WAF. La NAT opcional es única y depende de una AZ; para alta disponibilidad de salida, amplía el módulo por AZ.

Fuentes: [VPC origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html), [políticas TLS de CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesGeneral.html), [PrivateLink de Lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-endpoints.html).
