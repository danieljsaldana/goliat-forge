# Quickstart

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Inicio-rapido)

## Explore without AWS

From a repository checkout:

```sh
npm ci
npm run demo
```

Open `http://127.0.0.1:4080/`. The command prepares Next.js and serves an in-memory API. Both sample portals use a fictional operator; data disappears when you stop the process with Ctrl+C. No AWS resources are created.

For the explanatory website, use `make site-serve` and open `http://127.0.0.1:8768/`.

## Prepare a real installation

Requirements: Terraform >=1.10 and <2, Python >=3.11 on macOS/Linux, Node.js >=24, npm, AWS CLI v2 and Docker with a Linux engine/Buildx. Use SSO or a federated role with deployment and PassRole permissions. No permanent IAM users or access keys are created.

```sh
aws sso login --profile platform
./forge configure --name myforge --region eu-west-1 --config .local/config
./forge check
```

`platform` is an example local profile name. Edit the generated tfvars and activate only the required `.auto.tfvars` overrides. Keep the installation identity chosen by `configure`. Review [configuration](https://github.com/danieljsaldana/goliat-forge/wiki/Configuration), quotas and [costs](https://github.com/danieljsaldana/goliat-forge/wiki/Costs) before the billable deployment:

```sh
./forge --profile platform deploy --config .local/config --environment dev --yes
./forge --profile platform status --config .local/config --environment dev
```

The CLI coordinates state bootstrap → shared services → ARM64 image/functions → environment → private migration → workload activation → frontend. Each stage applies its saved plan. The first API starts after migration succeeds. `--yes` executes the reviewed changes.

## URLs, users and Prod

Read application URLs from `status`; do not construct endpoints from example names. Dev/demo accept the generated `*.cloudfront.net` hostname. Provision users in Cognito and grant `Operators` only to operators. No default business users or passwords are created.

Prod requires your domain, DNS and a validated ACM certificate in `us-east-1`. Configure them and verify MFA, backups and recovery before using `--environment prod`. `--environment all` coordinates separate states.

`plan` needs an existing shared stack and deployment artifacts: it is not one initial plan from nothing. Preserve bootstrap and backend metadata for future operations.

[Complete guide](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/deployment.en.md) · [Example application](https://github.com/danieljsaldana/goliat-forge/wiki/Example-application)
