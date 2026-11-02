# Desarrollo y contribuciones

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Development-and-contributing)

## Dónde hacer cambios

| Directorio | Contenido |
| --- | --- |
| `stacks/` y `modules/` | Composición de infraestructura y contratos Terraform |
| `environments/` y `examples/` | Perfiles y plantillas públicas comentadas |
| `apps/web/` | Frontend Next.js de referencia |
| `apps/api/`, `apps/shared/` | API, adaptadores y migraciones |
| `apps/worker/`, `apps/identity/` | Worker de negocio y auxiliar de identidad separados |
| `forgecli/`, `scripts/`, `tests/` | Coordinación, generación, controles y pruebas |
| `site/`, `docs/` | Web de producto y documentación bilingüe |
| `.github/` | Workflows, plantillas, dependencias y financiación |

## Verificar un cambio local

Con las herramientas de [inicio rápido](https://github.com/danieljsaldana/goliat-forge/wiki/Inicio-rapido):

```sh
npm ci
make check
make test
make terraform-test
make site-check
```

`make site-check` prepara el frontend y el sitio y ejecuta comprobaciones de navegador. Necesita las dependencias de la aplicación y Chromium de Playwright. Revisa `package.json` y los workflows para reproducir los pasos de CI. Las comprobaciones locales y las pruebas Terraform simuladas no despliegan AWS.

CI añade TFLint, auditoría npm, CodeQL y pruebas de integración con PostgreSQL, MySQL y MongoDB desechables. Los datos y contraseñas de esos contenedores son solo de prueba, no configuraciones de producción. Los pipelines actuales no despliegan automáticamente la infraestructura AWS.

El workflow de GitHub Pages publica la web. El de estrellas actualiza datos públicos diariamente; no necesita recompilar toda la página para cada cambio del contador.

## Proponer mejoras

Usa las [plantillas de incidencias](https://github.com/danieljsaldana/goliat-forge/issues/new/choose) para errores y propuestas, y explica el resultado esperado antes de un cambio grande. Un pull request debe describir problema, comportamiento resultante y validación. Si expones una opción Terraform, actualiza ejemplos, comentarios y documentación ES/EN; no copies solo valores de tu cuenta.

Lee [CONTRIBUTING.md](https://github.com/danieljsaldana/goliat-forge/blob/main/CONTRIBUTING.md) y [SECURITY.md](https://github.com/danieljsaldana/goliat-forge/blob/main/SECURITY.md). No publiques vulnerabilidades con datos explotables o credenciales en una incidencia pública; usa el canal de seguridad indicado.

## Qué no subir

No incluyas `.local/`, `.forge/`, `.env`, auto.tfvars reales, bootstrap, estados, planes, ZIP ni resultados con identificadores privados. El código de las funciones se versiona como fuente; los paquetes se generan durante el despliegue. Revisa archivos nuevos y diferencias, ejecuta el scanner de publicación y examina el historial si detectas exposición. Ignorar un archivo después de publicarlo no retira su contenido.

La licencia es [PolyForm Noncommercial 1.0.0](https://github.com/danieljsaldana/goliat-forge/blob/main/LICENSE); no es MIT ni autoriza usos comerciales de forma general. Revisa sus términos antes de reutilizar o distribuir el producto.

[Repositorio](https://github.com/danieljsaldana/goliat-forge/) · [Autor](https://danieljsaldana.dev/) · [Apoyar el proyecto](https://github.com/sponsors/danieljsaldana)
