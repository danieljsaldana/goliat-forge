# Security

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Seguridad)

## Layered protection

Forge combines protected web entry, network isolation, authentication and authorization. It is a foundation to validate for your use case, not a guarantee of absolute security or regulatory compliance.

| Flow | Main control |
| --- | --- |
| Browser → web/API | CloudFront HTTPS and a shared WAF web ACL |
| CloudFront → content | Private S3 bucket and Origin Access Control |
| CloudFront → backend | VPC origin and internal ALB; Fargate without public IPs |
| API/worker → database | Security groups, engine port, IAM, database permissions and validated TLS |
| Application → AWS services | Temporary roles and private endpoints, depending on the service |
| Administration | Operator SSO/role and AWS control-plane permissions |

**Not all traffic goes through WAF.** WAF inspects distribution HTTP requests; it does not inspect database, SQS or AWS control-plane connections. Cognito has its own sign-in service. No centralized egress firewall is included. Enabling NAT adds API HTTPS egress and needs a destination and cost review.

## Private networking and encryption

The database has no public access. Tasks and the business worker use private subnets. Private endpoints support AWS services without a general Internet egress route; S3 uses a gateway endpoint.

Browser entry uses HTTPS. The private CloudFront → ALB → API hops use **HTTP** in this version: there is no end-to-end TLS or mTLS. If your policy requires encryption on every hop, adapt listeners, certificates and services before accepting this design.

The Cognito public-key helper Lambda runs outside the VPC, without a Function URL or data permissions. It is separate from the private business worker. The API invokes it through IAM for key verification; it does not publish another Internet API.

## Identity and privileges

Cognito uses Authorization Code + PKCE, short-lived tokens and an `Operators` group. The Prod profile enables MFA by default. The API checks tokens, ownership and permissions even when a user knows an internal URL. Execution, application, migration and worker roles are separate.

The SPA stores its access token in `sessionStorage`; CSP and XSS protection remain necessary. No BFF or HttpOnly-cookie session is included. Sign-out clears the client session, but an issued JWT can remain valid until it expires.

AWS manages the database master secret. Only the private migration task reads it; the API and worker use IAM. Never publish credentials, `.env`, local auto.tfvars, states, plans, bootstrap files or logs containing tokens. A `.gitignore` does not revoke an already exposed secret.

## Before publishing your installation

Test cross-user access, operator permissions, MFA, invalid-token rejection, denial of direct S3/public ALB access, restoration and the selected engine's permissions. Review drift, dependencies and alarms continuously.

[Technical detail](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/security.en.md) · [Report a vulnerability](https://github.com/danieljsaldana/goliat-forge/blob/main/SECURITY.md) · [Production readiness](https://github.com/danieljsaldana/goliat-forge/wiki/Production-and-troubleshooting)
