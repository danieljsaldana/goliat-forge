# Operations and recovery

[Español](operations.md) · [Goliat Forge](../README.md)


## Diagnose

status reports URLs, user pool, cluster and service. CloudWatch retains API/migration, Lambda, WAF and VPC flow logs. ALB access logs use S3 with 90-day retention. Do not log credentials, tokens, Authorization headers or request payloads. WAF logs redact Authorization, Cookie and query strings.

After a lost response, retry the same UUID and payload. Do not create a second identifier when persistence is uncertain. During queue outages inspect forge.outbox and the recovery timer rather than editing rows to hide errors. Correct the cause before DLQ redrive; worker idempotency supports redelivery.

## Data recovery

Restore RDS into a new instance and reconnect the application as a real exercise. Backups alone do not prove recoverability. Validate IAM users, certificates, endpoint, schema, ownership and subsequent event processing. Define business RPO/RTO. Multi-AZ is neither a restore test nor a readable replica. Keep acceptance evidence containing real account metadata outside Git.

## Teardown

```
./forge --profile platform destroy --config .local/config --environment dev --confirm myforge --yes
```

The CLI saves and applies the exact destroy plan. RDS/ALB protections and nonempty buckets can deliberately block it. Review backups, apply an explicit deletion_protection change and choose final-snapshot handling before retrying. The final snapshot name is <installation>-<environment>-final: handle an older snapshot before reusing it. Object versions, content and images are not purged automatically.

Use --environment all --destroy-shared only after environment states are empty. ECR images are not force-deleted. The state bucket uses prevent_destroy and retains its local bootstrap state. Retiring it is a separate reviewed procedure after preserving/exporting all states. Never delete state files to force cleanup.

## Production acceptance

Verify a real AWS deployment in your region, service quotas, DNS/ACM, users/MFA, invalid-token rejection, two-user authorization isolation, no public ALB reachability, S3 denial outside CloudFront, RDS TLS, queue/DLQ recovery and backup restoration. Load-test and review the budget. Add internal-hop TLS and any required regulatory controls before accepting this foundation for a workload that needs them.
