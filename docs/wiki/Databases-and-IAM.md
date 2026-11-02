# Databases and IAM

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Bases-de-datos-e-IAM)

## Choose one profile per environment

| `db_kind` | Service | Application identity | Readers |
| --- | --- | --- | --- |
| `postgres` | RDS PostgreSQL, initial family 17 | IAM token and `rds_iam` user; validated TLS | None; Multi-AZ provides a standby for availability |
| `aurora-postgresql` | Aurora PostgreSQL, initial family 17 | IAM token and `rds_iam` user; validated TLS | Named reader-instance map |
| `aurora-mysql` | Aurora MySQL, initial family 8.4 | IAM token and `AWSAuthenticationPlugin`; validated TLS | Named reader-instance map |
| `documentdb` | Amazon DocumentDB 5.0 | `MONGODB-AWS`, IAM roles registered in `$external`; validated TLS | Named reader-instance map |

DocumentDB provides partial MongoDB API compatibility; it is not an identical MongoDB server. Check the operations and indexes your application requires. The reference application uses different adapters for each family.

## No application passwords in tfvars

Fargate and the worker assume IAM roles. SQL adapters generate a token when opening a physical connection; DocumentDB uses the role's temporary credentials. IAM policies and permissions inside the database work together.

AWS manages the master-user secret in Secrets Manager. Only the private migration task can read it to prepare schemas and users; the API and worker cannot read the master secret. There is no `DB_PASSWORD` to fill in and no permanent application access keys. The administrative secret still exists: AWS manages it and access is restricted.

## Instances and readers

`db_read_replicas` is a map with stable keys, up to five readers as a product limit. `primary` is reserved. Each reader supports `instance_class`, `promotion_tier` (0–15) and `availability_zone` within the environment's two AZs.

For Aurora/DocumentDB, `db_multi_az = true` requires at least one reader in another AZ. Setting the boolean alone is insufficient. The product's RDS PostgreSQL managed-master-secret configuration does not support read replicas; use Aurora for that pattern.

**The example application reads and writes through the writer.** Reader endpoints are outputs; adding readers does not automatically route application reads to them. Reader-count autoscaling is not included.

## Capacity, versions and recovery

`db_storage_gb` and `db_max_storage_gb` apply to RDS PostgreSQL. AWS manages Aurora/DocumentDB cluster storage. Copy the appropriate [engine example](https://github.com/danieljsaldana/goliat-forge/tree/main/examples/databases) to select a supported class; do not reuse `db.t4g.small` for Aurora without checking it.

Validate regional versions and instance availability in your account. Changing `db_kind` does not convert data or migrate schemas: it needs a migration plan, backups and a review of Terraform replacements. Test restoration and choose an explicit final-snapshot policy.

[Detailed reference](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/databases.en.md) · [Operations](https://github.com/danieljsaldana/goliat-forge/wiki/Operations)
