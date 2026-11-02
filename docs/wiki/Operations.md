# Operations and recovery

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Operacion)

## Know what is deployed

```sh
./forge --profile platform status --config .local/config --environment dev
./forge --profile platform plan --config .local/config --environment dev
```

`platform` and `myforge` are examples. Use `status` to locate URLs and resources. Review plans before applying changes and preserve bootstrap files. A plan needs an existing backend, shared services and artifacts; use the [quickstart](https://github.com/danieljsaldana/goliat-forge/wiki/Quickstart) `deploy` flow for initial installation.

CloudWatch collects application, migration, function, WAF and VPC flow logs. The ALB writes access logs to S3. Investigate using request IDs and timestamps; keep tokens, cookies, passwords and sensitive content out of logs and issues.

## Retries and events

When a create-request response is lost, retry with the same UUID and content. A new identifier can create another request.

With events enabled, inspect the outbox, queue, worker executions, recovery and DLQ. Fix the cause before redrive; idempotency supports duplicate deliveries. Do not delete rows or messages to hide failures. The DLQ alarm is a CloudWatch metric/alarm: connect the notification channels your team requires.

## Restore before you need to

Define RPO and RTO. Restore a backup into a new instance or cluster and verify endpoint, certificate, IAM roles, internal permissions, schema, request ownership and processing recovery. Update configuration and deployment in a controlled way. Multi-AZ improves availability; it neither replaces backups nor proves restoration works.

## Remove an environment

1. Review data, backups, dependencies and the plan. Deletion is destructive.
2. If protected, set `deletion_protection = false` in the complete environment object and **apply it through a normal deployment** before destroying.
3. Choose `skip_final_snapshot` and, if needed, a fresh `db_final_snapshot_identifier`. A previous teardown may already have used the default name.
4. Destroy using the actual installation name:

```sh
./forge --profile platform destroy --config .local/config --environment dev --confirm myforge --yes
```

The CLI applies the saved destruction plan. Versioned or populated buckets, ECR images and protection settings can block deletion. They are not automatically purged: review and remove only data you have decided to discard.

To remove shared services too, use `--environment all --destroy-shared` after every environment state is empty. The protected S3 backend and bootstrap are retained. Do not delete state files to force teardown. Final backend removal requires a separate review and preservation of states.

[Operations guide](https://github.com/danieljsaldana/goliat-forge/blob/main/docs/operations.en.md) · [Residual costs](https://github.com/danieljsaldana/goliat-forge/wiki/Costs)
