# Contribuir a Goliat Forge

[English](CONTRIBUTING.md)

Utiliza las plantillas para comunicar errores reproducibles, mejoras de documentación o propuestas concretas. Indica versión, configuración relevante y resultado esperado con datos ficticios. No publiques credenciales, estados, planes, tfvars reales ni datos personales en issues, capturas o pull requests.

Crea un fork y una rama de trabajo y abre una pull request explicando el problema, el comportamiento resultante y la validación. Mantén coherentes Terraform, ejemplos comentados, documentación y web. Actualiza español e inglés cuando cambien textos. Cada módulo mantiene sus entradas y salidas; evita crear otro acceso público que eluda el WAF.

Ejecuta `npm ci`, `make test`, `./forge check`, `make terraform-test` y `make site-check` (includes the Next.js build) según el cambio. Los cambios SQL utilizan PostgreSQL 17 desechable con `TEST_DATABASE_URL`; CI comprueba la integración. Las pruebas de infraestructura deben simular AWS explícitamente, sin credenciales cloud. Las pull requests no despliegan AWS automáticamente.

Las contribuciones utilizan PolyForm Noncommercial 1.0.0. Aporta solo trabajo que tengas derecho a compartir, conserva los avisos de terceros y explica cambios de dependencias/licencias. No se concede con carácter general uso comercial.
