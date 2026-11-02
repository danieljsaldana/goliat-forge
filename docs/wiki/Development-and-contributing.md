# Development and contributing

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Desarrollo-y-contribuciones)

## Where to make changes

| Directory | Contents |
| --- | --- |
| `stacks/` and `modules/` | Infrastructure composition and Terraform contracts |
| `environments/` and `examples/` | Profiles and commented public templates |
| `apps/web/` | Reference Next.js frontend |
| `apps/api/`, `apps/shared/` | API, adapters and migrations |
| `apps/worker/`, `apps/identity/` | Separate business worker and identity helper |
| `forgecli/`, `scripts/`, `tests/` | Orchestration, generation, checks and tests |
| `site/`, `docs/` | Product website and bilingual documentation |
| `.github/` | Workflows, templates, dependency updates and funding |

## Verify a local change

With the [quickstart](https://github.com/danieljsaldana/goliat-forge/wiki/Quickstart) tools installed:

```sh
npm ci
make check
make test
make terraform-test
make site-check
```

`make site-check` prepares the frontend/site and runs browser checks. It needs application dependencies and Playwright Chromium. Read `package.json` and the workflows to reproduce CI steps. Local checks and mocked Terraform tests do not deploy AWS.

CI adds TFLint, npm auditing, CodeQL and integration tests against disposable PostgreSQL, MySQL and MongoDB. Container data and passwords are test-only, not production configurations. Current pipelines do not automatically deploy AWS infrastructure.

The GitHub Pages workflow publishes the website. The stars workflow refreshes public data daily; every counter change does not require a complete website rebuild.

## Propose improvements

Use [issue templates](https://github.com/danieljsaldana/goliat-forge/issues/new/choose) for bugs and proposals, and explain the intended outcome before a large change. A pull request should describe the problem, resulting behavior and validation. When exposing a Terraform option, update examples, comments and ES/EN documentation; do not copy account-specific values.

Read [CONTRIBUTING.md](https://github.com/danieljsaldana/goliat-forge/blob/main/CONTRIBUTING.md) and [SECURITY.md](https://github.com/danieljsaldana/goliat-forge/blob/main/SECURITY.md). Do not publish exploitable vulnerability details or credentials in a public issue; use the documented security channel.

## Keep private material out

Do not include `.local/`, `.forge/`, `.env`, real auto.tfvars, bootstrap, states, plans, ZIP archives or outputs containing private identifiers. Functions are versioned as source; deployment builds their packages. Review new files and diffs, run the publication scanner and investigate history after any exposure. Ignoring a file after publishing it does not withdraw its contents.

The license is [PolyForm Noncommercial 1.0.0](https://github.com/danieljsaldana/goliat-forge/blob/main/LICENSE); it is not MIT and does not grant general commercial-use permission. Read its terms before reuse or distribution.

[Repository](https://github.com/danieljsaldana/goliat-forge/) · [Author](https://danieljsaldana.dev/) · [Sponsor the project](https://github.com/sponsors/danieljsaldana)
