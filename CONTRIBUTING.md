# Contributing to Goliat Forge

[Español](CONTRIBUTING.es.md)

Report reproducible bugs, documentation gaps and focused feature proposals using the issue forms. State the product version, configuration switches and expected behavior. Use fictional account metadata. Never include credentials, state, saved plans, real tfvars or personal data in issues, screenshots or pull requests.

Fork the repository, work on a focused branch and open a pull request with the problem, resulting behavior and relevant validation. Keep the product website, commented examples and documentation aligned with Terraform. Update English and Spanish when changing user-facing text. Each module owns its inputs and outputs; avoid introducing a second public entry bypassing WAF.

Run `npm ci`, `make test`, `./forge check`, `make terraform-test` and `make site-check` (includes the Next.js build) for applicable changes. SQL changes use a disposable PostgreSQL 17 database with `TEST_DATABASE_URL`; CI exercises the integration. Infrastructure tests must explicitly mock AWS and must not require cloud credentials. AWS deployment workflows never run automatically for pull requests.

Contributions use the repository's PolyForm Noncommercial 1.0.0 licence. Include only work you may contribute, preserve third-party notices and explain any dependency/licence changes. Commercial use is not generally granted.
