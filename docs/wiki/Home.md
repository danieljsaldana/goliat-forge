# Goliat Forge · Wiki

**Español / English**

[Web / Website](https://danieljsaldana.github.io/goliat-forge/) · [Repositorio / Repository](https://github.com/danieljsaldana/goliat-forge) · [Versiones / Releases](https://github.com/danieljsaldana/goliat-forge/releases)

Una arquitectura AWS modular construida con Terraform. Comparte servicios de plataforma y conserva Dev y Prod con sus propias redes, identidades, aplicaciones y datos. Adapta las piezas a tu proyecto con configuración comentada.

A modular AWS reference architecture built with Terraform. Share platform services while Dev and Prod keep their own networks, identities, applications and data. Adapt the building blocks to your project through commented configuration.

> **Aplicación de ejemplo:** Luma incluye un frontend Next.js, una API Node.js y persistencia privada configurable. SQS y el worker Lambda son opcionales. Sus dos portales permiten probar la arquitectura; puedes sustituir la aplicación.
>
> **Example application:** Luma includes a Next.js frontend, a Node.js API and configurable private persistence. SQS and the Lambda worker are optional. Its two sample portals exercise the architecture; the application is replaceable.

## Por dónde empezar / Start here

1. **Entender la arquitectura / Understand the architecture** — [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Arquitectura) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Architecture).
2. **Probar en local y preparar AWS / Try locally and prepare AWS** — [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Inicio-rapido) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Quickstart).
3. **Revisar configuración y datos / Review configuration and data** — [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Configuracion) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Configuration).
4. **Preparar producción / Prepare production readiness** — [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Produccion-y-problemas) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Production-and-troubleshooting).

## Guías / Guides

| Español | English |
| --- | --- |
| [Arquitectura](https://github.com/danieljsaldana/goliat-forge/wiki/Arquitectura) | [Architecture](https://github.com/danieljsaldana/goliat-forge/wiki/Architecture) |
| [Inicio rápido](https://github.com/danieljsaldana/goliat-forge/wiki/Inicio-rapido) | [Quickstart](https://github.com/danieljsaldana/goliat-forge/wiki/Quickstart) |
| [Configuración](https://github.com/danieljsaldana/goliat-forge/wiki/Configuracion) | [Configuration](https://github.com/danieljsaldana/goliat-forge/wiki/Configuration) |
| [Módulos Terraform](https://github.com/danieljsaldana/goliat-forge/wiki/Modulos) | [Terraform modules](https://github.com/danieljsaldana/goliat-forge/wiki/Terraform-modules) |
| [Bases de datos e IAM](https://github.com/danieljsaldana/goliat-forge/wiki/Bases-de-datos-e-IAM) | [Databases and IAM](https://github.com/danieljsaldana/goliat-forge/wiki/Databases-and-IAM) |
| [Aplicación de ejemplo](https://github.com/danieljsaldana/goliat-forge/wiki/Aplicacion-de-ejemplo) | [Example application](https://github.com/danieljsaldana/goliat-forge/wiki/Example-application) |
| [Seguridad](https://github.com/danieljsaldana/goliat-forge/wiki/Seguridad) | [Security](https://github.com/danieljsaldana/goliat-forge/wiki/Security) |
| [Operación y recuperación](https://github.com/danieljsaldana/goliat-forge/wiki/Operacion) | [Operations and recovery](https://github.com/danieljsaldana/goliat-forge/wiki/Operations) |
| [Costes y capacidad](https://github.com/danieljsaldana/goliat-forge/wiki/Costes) | [Costs and capacity](https://github.com/danieljsaldana/goliat-forge/wiki/Costs) |
| [Producción y problemas](https://github.com/danieljsaldana/goliat-forge/wiki/Produccion-y-problemas) | [Production and troubleshooting](https://github.com/danieljsaldana/goliat-forge/wiki/Production-and-troubleshooting) |
| [Desarrollo y contribuciones](https://github.com/danieljsaldana/goliat-forge/wiki/Desarrollo-y-contribuciones) | [Development and contributing](https://github.com/danieljsaldana/goliat-forge/wiki/Development-and-contributing) |

## Tres formas de explorar / Three ways to explore

| Opción / Option | Dónde se ejecuta / Where it runs | AWS |
| --- | --- | --- |
| Laboratorio web / Website lab | Navegador, datos ficticios en memoria / Browser, fictional in-memory data | No |
| `npm run demo` | Next.js + API local en `127.0.0.1:4080` / Local Next.js + API | No |
| Perfil Terraform demo / Terraform demo profile | Instalación AWS separada / Separate AWS installation | Recursos reales y facturables / Real billable resources |

## Documentación y comunidad / Documentation and community

[README en español](https://github.com/danieljsaldana/goliat-forge/blob/main/README.es.md) · [English README](https://github.com/danieljsaldana/goliat-forge/blob/main/README.md) · [Seguridad / Security](https://github.com/danieljsaldana/goliat-forge/blob/main/SECURITY.md) · [Contribuir / Contribute](https://github.com/danieljsaldana/goliat-forge/blob/main/CONTRIBUTING.md)

La wiki orienta el recorrido; el repositorio mantiene los comandos, los módulos y los ejemplos completos. Esta edición utiliza una cuenta AWS y una región de cargas, con WAF global en `us-east-1`. La verificación automática no sustituye una prueba real de despliegue, permisos y recuperación.

The wiki guides your reading; the repository maintains commands, modules and complete examples. This edition uses one AWS account and one workload region, with global WAF in `us-east-1`. Automated checks do not replace real deployment, permission and recovery exercises.

[Autor / Author](https://danieljsaldana.dev/) · [GitHub Sponsors](https://github.com/sponsors/danieljsaldana)

También del mismo autor / Also by the same author: [Goliat Nexus](https://danieljsaldana.github.io/goliat-nexus/), arquitectura para Azure / an Azure application foundation; [Goliat Cloud Inventory](https://danieljsaldana.github.io/goliat-cloud-inventory/), inventario y FinOps para Azure / Azure inventory and FinOps.
