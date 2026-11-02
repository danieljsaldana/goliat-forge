# Security and secrets

[Español](security.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

The product separates public entry, application networking, data and process permissions. It makes no absolute security guarantee and does not replace organizational controls. API authorization remains required alongside WAF and private networking.

## Credentials

Terraform uses an existing SSO session or temporary role credentials, without creating permanent access keys. RDS generates and manages its master secret in Secrets Manager with KMS encryption; Terraform retains metadata only. The migration task has GetSecretValue on that exact ARN and service-constrained Decrypt. API and worker cannot read the master secret; rds-db:connect targets their specific database users.

ECS separates execution, application and migration roles. Lambda separates business processing from the signing-key helper. ecr:GetAuthorizationToken requires Resource:*, while image pulls are repository-scoped. VPC Lambda integration needs specific EC2 network-interface actions on Resource:*; this is not broad EC2 administration. EFS or global Secrets Manager access is not granted.

## Git and browser data

Publication scanning checks AWS keys, private keys, real configuration names, ZIPs, states, plans and non-example account metadata. .local/, .forge/, .env and real *.auto.tfvars are ignored. Ignore rules cannot remove an already-versioned secret: revoke it, investigate history and remediate exposure. The RDS .crt bundle contains public certificates, not private keys.

config.json has public Cognito identifiers and routes. The SPA uses sessionStorage for access tokens and therefore needs XSS protections. CSP, React text escaping and no third-party scripts reduce exposure; this is not an HttpOnly cookie session. Consider a BFF and centralized session management for higher-risk applications.

## Boundaries

The generated CloudFront certificate is an evaluation option; Prod requires a domain and ACM for modern TLS policy. Internal HTTP hops are not mTLS. Cognito login and its public signing keys sit outside the application WAF HTTP path. The signing-key helper has no public endpoint or data permissions. Manual SG, role, listener or distribution changes can invalidate controls; review drift and plans.

Automated scenarios validate contracts, not the absence of vulnerabilities or real AWS production acceptance.
