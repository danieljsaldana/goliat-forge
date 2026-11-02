# Configuration

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Configuracion)

## Start with the commented templates

`./forge configure --name myforge --region eu-west-1 --config .local/config` prepares local configuration. `myforge` is an example installation name. Select AWS authentication outside tfvars through SSO or a federated role.

| Public template | Purpose |
| --- | --- |
| [environments/common.tfvars](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/common.tfvars) | Installation identity, region, tags, budget and logs |
| [common.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/common.auto.tfvars.example) | Every public `common` option, including the WAF limit |
| [dev.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/dev.auto.tfvars.example) | Every public Dev environment option |
| [prod.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/prod.auto.tfvars.example) | Every public Prod environment option |
| [examples/demo](https://github.com/danieljsaldana/goliat-forge/tree/main/examples/demo) | Independent evaluation installation |
| [local.auto.tfvars.example](https://github.com/danieljsaldana/goliat-forge/blob/main/environments/local.auto.tfvars.example) | Advanced internal overrides, commented out and inactive |

Generated files stay in `.local/config`, which Git ignores. To enable an override, copy its `.example` file without that suffix and edit it. For example:

```sh
cp .local/config/dev.auto.tfvars.example .local/config/dev.auto.tfvars
```

## Loading order and object replacement

The CLI loads `common.tfvars` → `common.auto.tfvars` → `<environment>.tfvars` → generated runtime → `local.auto.tfvars` → `<environment>.auto.tfvars`. It passes the files explicitly to Terraform: a file placed in an arbitrary directory is not enough.

**Objects are replaced as a whole.** Copy the complete `environment` or `common` template; do not expect a partial object to merge deeply. Omitted optional fields use their Terraform defaults.

Keep the name and region chosen with `configure`. The CLI validates the effective plan identity and checks that the environment name matches its state. A different identity or region requires a new installation and a migration plan.

## What you can configure

| Area | Main options |
| --- | --- |
| Network | Canonical RFC1918 /16–/19 CIDR, endpoints in one or two AZs, optional NAT |
| API | Supported ARM64 CPU/memory, desired/minimum replicas, maximum, CPU target and scaling cooldowns |
| Data | One of four profiles, version, class, cluster readers, AZ placement, backups, protection and final snapshot |
| Identity and web | MFA, domain/certificate and `portals` map using `requester`/`operator` views |
| Events | SQS/worker activation, memory, timeout, batch, concurrency, retry count, retention and recovery |
| Platform | Tags, WAF limit, monthly budget, recipients and log retention |

Portals are reusable examples. Adding map entries creates additional routes to those views, not another business application.

The CLI coordinates `platform`, `api_image`, `worker_archive`, `frontend_script_hashes` and `activate_workloads`. Do not override them during normal deployment. Tfvars must not contain passwords or AWS keys. The templates cover the product's public inputs; changing arbitrary internal AWS attributes requires module changes.

[Complete reference and limits](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/configuration.en.md) · [Databases](https://github.com/danieljsaldana/goliat-forge/wiki/Databases-and-IAM)
