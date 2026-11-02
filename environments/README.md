# Configuration / Configuración

Read [configuration](../docs/configuration.en.md) / [variables y tfvars](../docs/configuration.md). Use `./forge configure --name myforge --config .local/config`, then edit its commented files. Deploy Dev first. Prod requires a validated custom domain/ACM certificate and acceptance checks.

The source examples contain no real account identifiers. `dev.auto.tfvars.example` and `prod.auto.tfvars.example` are full optional object overrides; copy and adapt them inside `.local/config/`, not into the Terraform stack. The CLI explicitly passes `<environment>.auto.tfvars` last. Whole objects replace rather than deep-merge. Runtime `.auto.tfvars.json` values are generated in ignored `.forge/` directories and never carry passwords.

`common.auto.tfvars.example` covers all shared settings. The CLI loads its active copy for both shared and workload stacks. The Dev/Prod examples cover all public workload settings, including each reader's `instance_class`, `promotion_tier` and `availability_zone`. `local.auto.tfvars.example` documents internal runtime inputs and is inert until you uncomment an explicit override. These files contain example values, not AWS credentials.

Las plantillas cubren todas las entradas públicas del producto; las políticas internas de los módulos siguen requiriendo cambios de código. `configure` también copia estas plantillas a tu configuración local para que no tengas que buscar los ficheros en el repositorio.
