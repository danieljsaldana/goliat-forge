# Prepare and deploy

[Español](deployment.md) · [Goliat Forge](../README.md)


## Requirements

Terraform >=1.10 and <2, Python >=3.11 on macOS/Linux, Node.js >=24 and npm, AWS CLI v2 with SSO or a federated role, and Docker with a Linux engine and Buildx for linux/arm64. The operator needs resource management, IAM/PassRole, CloudFront VPC-origin service-linked role, KMS and backend permissions. No IAM users or permanent access keys are created. Operator permissions differ from application task permissions.

```
npm ci
./forge check
npm test
npm run demo
```

The local application is http://127.0.0.1:4080. Stop an existing instance before reusing the port. Use make site-serve for the separate product website.

## First AWS installation

```
aws sso login --profile platform
./forge configure --name myforge --region eu-west-1 --config .local/config
# Edit .local/config/common.tfvars and dev.tfvars.
./forge --profile platform deploy --config .local/config --environment dev --yes
```

The CLI bootstraps the encrypted state backend while retaining its local bootstrap state, applies shared resources, publishes an ARM64 ECR image and resolves its digest. It builds the Next.js export and matching CSP hashes, packages functions from source, creates the environment inactive on first deployment, runs a private Fargate database migration, then activates the API, autoscaling and any enabled events. It publishes the frontend without overwriting config.json and waits for ECS stability. Every apply consumes an exact saved plan; dependencies require sequential plans.

Docker receives the temporary ECR password through stdin and uses a temporary credential directory removed afterward. Plans, metadata, bootstrap state and runtime inputs remain in .forge/. Preserve a secure bootstrap-state backup.

## Prod

The Prod profile includes two replicas, endpoints across two AZs, RDS Multi-AZ, 14-day backups, deletion protection and required MFA. Configure domain_name and its validated ACM us-east-1 certificate_arn, then point domain DNS at CloudFront. Deploy with --environment prod. --environment all coordinates Dev and Prod while retaining separate states.

## Users and subsequent plans

Use the user_pool_id from status to create Cognito users. Add only authorized operators to Operators. User creation is administrator-only; no default passwords or automatic business identities are created. Configure Cognito email delivery and quotas before inviting real users.

```
./forge --profile platform status --config .local/config --environment dev
./forge --profile platform plan --config .local/config --environment dev
```

plan needs existing shared resources and the published image artifact. It creates saved plans without creating resources. Bootstrap and initial publication resolve dependencies before an environment plan. Interrupted runs retain plans and the latest migration-task ARN. Diagnose with CloudWatch and rerun; do not delete state to fix failures.

Frontend publication uploads fingerprinted Next.js chunks with immutable cache headers first, then HTML and public files while preserving config.json, followed by invalidation. It retains old chunks for browsers still using older HTML. Plan their cleanup only after a defined rollback window.
