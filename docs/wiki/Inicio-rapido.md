# Inicio rápido

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [English](https://github.com/danieljsaldana/goliat-forge/wiki/Quickstart)

## Explorar sin AWS

Desde una copia del repositorio:

```sh
npm ci
npm run demo
```

Abre `http://127.0.0.1:4080/`. El comando prepara Next.js y sirve la API en memoria. Los portales usan un operador ficticio; los datos desaparecen al detener el proceso con Ctrl+C. No crea recursos AWS.

Para la web explicativa usa `make site-serve` y abre `http://127.0.0.1:8768/`.

## Preparar una instalación real

Necesitas Terraform >=1.10 y <2, Python >=3.11 en macOS/Linux, Node.js >=24, npm, AWS CLI v2 y Docker con motor Linux/Buildx. Usa una sesión SSO o un rol federado con permisos de despliegue y PassRole. No se crean usuarios IAM ni access keys permanentes.

```sh
aws sso login --profile platform
./forge configure --name myforge --region eu-west-1 --config .local/config
./forge check
```

`platform` es un nombre de perfil local de ejemplo. Edita los tfvars generados y activa solo los overrides `.auto.tfvars` necesarios. Conserva la identidad elegida con `configure`. Revisa [configuración](https://github.com/danieljsaldana/goliat-forge/wiki/Configuracion), cuotas y [costes](https://github.com/danieljsaldana/goliat-forge/wiki/Costes) antes de ejecutar un despliegue facturable.

```sh
./forge --profile platform deploy --config .local/config --environment dev --yes
./forge --profile platform status --config .local/config --environment dev
```

El CLI coordina bootstrap del estado → servicios compartidos → imagen ARM64 y funciones → entorno → migración privada → activación de cargas → frontend. Aplica el plan guardado de cada etapa. La primera API arranca después de completar la migración. `--yes` ejecuta los cambios revisados.

## URLs, usuarios y Prod

Obtén las URLs de `status`; no construyas endpoints a partir del nombre de ejemplo. Dev/demo admiten el hostname generado `*.cloudfront.net`. Crea los usuarios en Cognito y asigna `Operators` únicamente a los operadores. No hay usuarios ni contraseñas de negocio predeterminados.

Prod exige dominio propio, DNS y certificado ACM validado en `us-east-1`. Configúralos y verifica MFA, backups y recuperación antes de usar `--environment prod`. `--environment all` coordina estados separados.

`plan` requiere que shared y los artefactos del despliegue ya existan: no es un plan único de primera instalación desde cero. Conserva el bootstrap y el backend para futuras operaciones.

[Guía completa](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/deployment.md) · [Aplicación de ejemplo](https://github.com/danieljsaldana/goliat-forge/wiki/Aplicacion-de-ejemplo)
