# Luma: frontend, API and functions

[Español](reference.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

## Next.js frontend

apps/web is a React application built with Next.js (Pages Router) and output: export. npm run setup:web installs its lockfile; npm run build:web produces apps/web/out/. Private S3 stores the files and CloudFront serves them. There is no Next.js server, SSR, Next API route or secret in NEXT_PUBLIC_*. The separate Node.js API runs in Fargate.

The two portals are views of one frontend: requester for creating and reading owned requests, operator for the team view. The portals map adds paths to those views, not independent applications. The backend verifies Operators for global access regardless of the URL opened.

Authentication uses Authorization Code + PKCE with one-time state. Only the access token and expiry are kept in sessionStorage; refresh tokens are discarded. There is no client secret. Access tokens expire after 15 minutes. Logout removes the local token and signs out of Cognito; an issued JWT remains valid until expiry.

The build derives exact SHA-256 hashes for exported inline scripts. The CLI adds them to the CloudFront CSP without enabling unsafe-inline or unsafe-eval for JavaScript. A rebuilt frontend must be deployed together with its matching hashes.

## Basic mode and optional SQS

With events_enabled = false (the default), POST saves directly to PostgreSQL and returns 201, or 200 when the same ID and content already exist. It creates no outbox row and publishes no SQS message. The frontend displays Saved and hides worker activity and metrics.

With events_enabled = true, the API commits request and outbox together, returns 202 for a new request and reports delivery. Terraform adds SQS, DLQ, an SQS endpoint, a Lambda worker and recovery. The UI exposes asynchronous processing. Switching modes does not replay requests created without events. Review pending messages and outbox rows before disabling events.

npm run demo uses the basic local mode. EVENTS_ENABLED=true npm run demo enables an in-memory worker simulation; it creates no AWS queue.

## Node.js API

GET /api/me identifies the caller. GET /api/requests and /api/activities scope results to the owner unless the caller is an Operator. Request detail applies the same rule. POST /api/requests validates title/detail and a client-generated UUID v4. Replaying the same ID and content returns the existing request after a lost response; changed content with that ID conflicts. The API never trusts an owner in the body or treats the admin URL as authorization.

The container runs unprivileged with a read-only root filesystem. forge_api can read/insert requests, read activity and operate the outbox; it cannot change processing status or drop tables. PostgreSQL uses per-connection IAM tokens and TLS with RDS CA validation. The master user never serves application requests.

## Worker and outbox

Request and event commit together. If SQS fails afterward, the response confirms persistence while delivery remains pending. A five-minute timer recovers up to 100 pending rows; tune frequency/batches for your volume. Queue delivery is at least once. Transactions, row locks and a unique activity key prevent duplicate business processing. Partial failures return messageId values. Five failed deliveries send a record to the DLQ with 14-day retention. The CloudWatch DLQ alarm is created without automatically wiring an external notification channel.

The identity-key Lambda is a separate helper: it has no business data access and no Function URL. Authorized roles invoke it to obtain Cognito public keys. It runs outside the VPC for that limited outbound fetch.

## Database bootstrap

A separate Fargate migration task retrieves the managed master secret, creates the schema and grants least-privilege SQL users. The API role cannot read that secret. Migration runs inside the VPC without SSH, a bastion or direct PostgreSQL access from GitHub or your Mac. Future schema changes need versioned migrations and compatibility planning; the included bootstrap idempotently creates the initial schema.


## Product website demo

The website contains a separate browser-only preview of the shared domain logic. Web + API mode does not create an outbox. The SQS mode simulates failed delivery, recovery and duplicate events. User A and B see separate records; the operator can view both. Changing mode or pressing Reset clears the fictional in-memory data. This preview neither runs the real Next.js export nor proves IAM or network enforcement; `npm run demo` runs the real Next.js/Node.js application locally.

Worker timeout, memory, retry count, queue retention and recovery frequency are configured in `environment.events`. The five-minute timer and five receives described above are defaults. The CloudWatch DLQ alarm has no automatic external notification integration.
