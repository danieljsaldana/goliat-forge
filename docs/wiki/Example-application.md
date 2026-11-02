# Example application

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Aplicacion-de-ejemplo)

## Luma: one request crosses the architecture

The reference application creates requests and displays their status. It demonstrates integration, authorization and processing; the portals are not a finished business product.

| Component | Implementation and purpose |
| --- | --- |
| Frontend | Next.js static export to private S3, served by CloudFront |
| Backend | Node.js on private Fargate; authentication and request operations |
| Identity | Cognito Authorization Code + PKCE and API-side JWT verification |
| Data | Adapter for the selected PostgreSQL, Aurora or DocumentDB profile |
| Optional worker | In-VPC Lambda, SQS and DLQ for asynchronous activities |

The `portals` map initially defines `tenant` (`requester` view) and `admin` (`operator` view). Add routes to reuse either view. A route's name or visibility grants no permissions: the backend checks identity, ownership and `Operators` group membership.

## Flow without events

1. A user signs in and receives a short-lived token.
2. The frontend calls `/api` through CloudFront and WAF.
3. The API validates the token and writes to the private database.
4. Users list their own requests; operators can review everyone's requests.

With `events_enabled = false`, no outbox is created and requests do not wait for a worker. This is the initial profile for a simple website and API.

## Flow with SQS

With events enabled, the request and its outbox event are stored in one transaction. Publishing to SQS sends work to the worker, which records the activity and outcome idempotently. A timer recovers pending events; the DLQ receives messages that exhaust their attempts. This is not an exactly-once delivery guarantee: SQS can deliver duplicates.

The frontend reuses the same UUID when retrying a lost response. The same identifier and content return the existing result; changed content returns a conflict. Idempotency does not replace request ownership checks.

## Three ways to try it

| Mode | What it demonstrates |
| --- | --- |
| Product-site lab | Visual explanation and in-memory data; no AWS security validation |
| `npm run demo` | Real Next.js frontend and API on localhost, without AWS authentication and using a fictional operator |
| `./forge ... deploy --environment demo` | Billable AWS resources, Cognito, IAM, networking and real data |

Locally, `EVENTS_ENABLED=true npm run demo` simulates asynchronous processing; it does not connect to SQS. In-memory data disappears when the process stops. Use two real users and an operator to validate AWS isolation and permissions.

[Flows and acceptance](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/workflows.en.md) · [Application reference](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/reference.en.md)
