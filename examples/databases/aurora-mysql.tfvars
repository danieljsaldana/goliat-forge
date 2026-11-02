# Complete Dev override. Review costs: writer + one billable reader.
# Copy the full environment object to .local/config/dev.auto.tfvars.
# Development owns its VPC, database, identity pool and API. Events are optional.
environment = {
  name              = "dev"
  vpc_cidr          = "10.40.0.0/16"
  endpoint_az_count = 1     # Lower endpoint cost; cross-AZ traffic is possible.
  nat_enabled       = false # AWS service endpoints only; no general Internet egress.

  cpu          = 256 # 0.25 vCPU; see supported CPU/memory pairs.
  memory       = 512 # MiB per Fargate task.
  replicas     = 1
  max_replicas = 2

  # Choose ONE database profile. The application adapter and private port follow it.
  # postgres | aurora-postgresql | aurora-mysql | documentdb
  db_kind = "aurora-mysql"

  # Optional read capacity. Separate from app replicas and RDS Multi-AZ standby.
  db_read_replicas = {
    reader-a = { instance_class = "db.r6g.large", promotion_tier = 1 }
  }

  db_instance_class   = "db.r6g.large"
  db_engine_version   = null # RDS: 17; Aurora: regional minor within PG17/MySQL8.4; DocumentDB: 5.0.0 (IAM).
  db_storage_gb       = 20   # RDS only. Cluster storage is managed by Aurora/DocumentDB.
  db_multi_az         = true # Clusters: true requires at least one reader in another AZ.
  db_backup_days      = 7
  deletion_protection = true # Disable explicitly and review before teardown.
  skip_final_snapshot = false

  events_enabled = false # Optional: SQS, DLQ, Lambda worker and recovery timer.
  mfa_required   = false # Cognito TOTP is optional in Dev.

  # No domain required: CloudFront supplies an HTTPS *.cloudfront.net hostname.
  domain_name     = null
  certificate_arn = null # For a custom domain, use its ACM certificate in us-east-1.

  # Add another map entry to reuse a reference view under another URL path.
  # These two interfaces are examples, not generated business applications.
  portals = {
    tenant = { label = "Request portal", view = "requester" }
    admin  = { label = "Operations", view = "operator" }
  }
}
