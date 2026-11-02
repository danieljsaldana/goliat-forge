# Production and troubleshooting

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Produccion-y-problemas)

## From example to real project

The Prod profile strengthens configuration, but it does not replace architecture and operational review. Before accepting the installation:

- Configure your domain, DNS and a validated ACM certificate in `us-east-1`. Prod requires it for a modern TLS policy; the free CloudFront hostname is for Dev/demo.
- Check regional quotas and support for ARM64 Fargate, CloudFront VPC origins, Lambda and the chosen database engine/class.
- Test with two users and an operator: request isolation, permissions, token expiry, MFA and access denial.
- Verify that S3, ALB and the database cannot be used directly from the Internet; test allowed routes rather than just the homepage.
- Run load, applicable failover, backup restoration and, with events enabled, outbox/DLQ recovery tests.
- Define on-call ownership, notification recipients, retention, RPO/RTO and update/retirement procedures.

Dev and Prod share one account and workload region. Organizations, multi-account separation and multi-region recovery are not included. Two-AZ subnets do not automatically make every dependency highly available: review tasks, endpoints, database and the optional single-AZ NAT.

Private HTTP hops, the `sessionStorage` SPA token model and the absence of a centralized egress firewall are deliberate foundation choices. Extend them if your policies require all-hop TLS, a BFF, egress inspection or additional compliance controls.

## Common problems

| Symptom | Review |
| --- | --- |
| `plan` cannot find outputs or artifacts | Complete initial bootstrap/deployment; `plan` does not create everything from an empty account |
| CLI rejects identity or environment | Keep the `common.name`/`region` chosen by `configure` and the selected state's environment name; do not replace Dev with Prod inside the object |
| Prod certificate error | `us-east-1`, validation, hostname coverage and DNS pointing to the correct distribution |
| Fargate cannot pull or start | ARM64 digest, ECR, endpoints, security groups, logs and successful migration before task activation |
| Database IAM access denied | Engine, internal user/role, connection resource ARN/ID, task role, clock and TLS CA; do not disable validation |
| Reader validation fails | This product does not support RDS readers; clusters need valid keys, compatible classes and another AZ when Multi-AZ is enabled |
| Web loads but an action fails | `/api` response, JWT/group/ownership and matching frontend/config/CSP; do not publish tokens while debugging |
| Event-driven request stays pending | Outbox, SQS publishing, worker, recovery timer and DLQ; retry the request with its original UUID |
| `destroy` is blocked | Protection already applied as false, snapshot policy/unique name, S3 versions/content and ECR images |

The pipeline tests adapters against disposable PostgreSQL, MySQL and MongoDB; it does not certify all Aurora/DocumentDB differences. Final acceptance requires real tests in your account and region.

[Security](https://github.com/danieljsaldana/goliat-forge/wiki/Security) · [Deployment](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/deployment.en.md) · [Report an issue](https://github.com/danieljsaldana/goliat-forge/issues/new/choose)
