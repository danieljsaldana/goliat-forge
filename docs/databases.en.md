# Database engines, roles and replicas

[Español](databases.md) · [Goliat Forge](../README.md)

Select **one engine per environment** through `environment.db_kind`. The CLI wires the Node.js adapter, private port, migration and permissions. Dev and Prod can use different engines; the product neither converts nor synchronizes their data.

| Profile | Engine / port | Application authentication | Availability and reads |
| --- | --- | --- | --- |
| `postgres` | RDS PostgreSQL / 5432 | IAM tokens, SQL user with `rds_iam` | Optional Multi-AZ, non-readable standby |
| `aurora-postgresql` | Aurora PostgreSQL / 5432 | IAM tokens, separate users | Writer + named readers and promotion priorities |
| `aurora-mysql` | MySQL-compatible Aurora / 3306 | IAM tokens via `AWSAuthenticationPlugin` | Writer + named readers and promotion priorities |
| `documentdb` | DocumentDB 5.0 / 27017 | `MONGODB-AWS`, role ARN in `$external` | Writer + readers, collection-scoped database roles |

## Configuration

The [complete examples](../examples/databases/README.md) are Dev overrides. After `./forge configure`, copy one to `.local/config/dev.auto.tfvars` and keep your installation's `common.tfvars`. Terraform replaces the entire `environment` object; maps do not deep-merge.

```hcl
# Inside environment. A fragment, not a complete tfvars file.
db_kind           = "aurora-postgresql"
db_instance_class = "db.r6g.large"
db_engine_version = null

db_multi_az = true

db_read_replicas = {
  reader-a = {
    instance_class = "db.r6g.large"
    promotion_tier = 1
  }
  reader-b = {
    instance_class = "db.r6g.large"
    promotion_tier = 2
  }
}
```

`db_instance_class` sizes the writer; readers can select other classes. Map keys are stable identities: renaming one replaces the instance. Lower `promotion_tier` values have higher promotion preference (0–15); tiers do not control query distribution. This edition supports up to five readers as a product limit, not a universal AWS quota. Reader-count autoscaling is not included.

Cluster profiles with `db_multi_az = true` require a reader and place it in another AZ. Redundant AWS-managed cluster storage alone does not provide a second compute instance ready for failover. RDS Multi-AZ creates a standby that cannot serve reads.

**RDS restriction:** AWS cannot create PostgreSQL read replicas when the source manages its master secret with Secrets Manager. The `postgres` profile therefore requires `db_read_replicas = {}`. Choose Aurora PostgreSQL for readers with this secret model. The product does not switch to a manually managed password as a workaround. [AWS limitation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html).

## Versions and storage

With `db_engine_version = null`, RDS uses family 17; Aurora resolves a regional release within PostgreSQL 17 or MySQL 8.4; DocumentDB uses 5.0.0 for IAM identity authentication. Pin a full Aurora version after evaluation for controlled updates. Regional version resolution does not prove all instance classes are available; check region, class and quotas before applying. Automatic major upgrades are not enabled.

`db_storage_gb` only controls RDS allocation and its growth limit (three times the initial value). Aurora and DocumentDB manage cluster storage; this field does not cap their bill. Cluster profiles use provisioned compute, defaulting to `db.r6g.large` when no class is provided. Every writer, reader and standby incurs cost. [Costs](costs.en.md).

## Application roles instead of passwords

API, worker and migration have separate roles. For SQL, IAM grants `rds-db:connect` only to the selected resource ID and database user. Aurora requires the **cluster resource ID**, not an instance ID. Migration creates least-privilege SQL users. MySQL's authentication plugin generates a fresh token for each physical connection and requires validated TLS.

DocumentDB maps API/worker IAM role ARNs to users in `$external`. Collection-scoped database roles provide authorization; no invented `docdb:connect` policy is used. The driver retrieves temporary Fargate/Lambda role credentials and authenticates with `MONGODB-AWS`. API users cannot update requests or drop collections. DocumentDB scopes the worker's update privilege to a collection, not a field; SQL limits updates to `status`.

There are no passwords in tfvars and no `DB_PASSWORD`. **Initial administration still has a secret:** RDS/Aurora/DocumentDB generate, store and rotate it in Secrets Manager. Only the migration task may read that exact ARN. Terraform creates no secret version containing the password. RDS/Aurora use the module CMK for their master secret. With the selected provider, native DocumentDB secret management uses the Secrets Manager managed key while data uses a separate CMK. The product does not claim the administrator has no credential.

## Reads, consistency and SQS

The reference app reads and writes through the writer endpoint for read-after-write consistency. `installation.database.readers` exposes reader endpoints for queries that tolerate replication lag. The product does not automatically route reference requests there. A cluster reader endpoint with no readers can route to its writer, so the product outputs an empty reader list when none are configured.

SQS remains optional with every engine. The three adapters retain request ownership, idempotent retries and transactional outbox behavior. DocumentDB transactions disable causal consistency; retryable writes are disabled for the 5.0 profile. Collections and indexes exist before workloads start.

## Compatibility and changes

DocumentDB is not the MongoDB server. Its API compatibility is partial, with differences in indexes, transactions and commands. The reference uses a locally tested subset; an existing MongoDB app must validate its own features. [DocumentDB IAM](https://docs.aws.amazon.com/documentdb/latest/devguide/iam-identity-auth.html), [transactions](https://docs.aws.amazon.com/documentdb/latest/devguide/transactions.html), [Aurora IAM](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html).

Changing `db_kind` on an installation with data **does not migrate it**: it changes managed Terraform resources. Keep deletion protection, prepare a target installation, export/import with engine tools, verify permissions and data, then cut over with a rollback plan. Local PostgreSQL, MySQL and MongoDB tests verify the contract and permissions; they do not replace real Aurora/DocumentDB or AWS IAM acceptance.

Each reader also accepts availability_zone from the environment data subnet AZs. Default placement is stable: the second AZ when Multi-AZ is required, otherwise the first. Adding a map key does not move existing readers. Multi-AZ rejects readers placed entirely in the writer AZ.
