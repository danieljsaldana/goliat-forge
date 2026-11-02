# Production owns its VPC, database, identity pool and API. Events are optional.
environment = {
  name              = "prod"
  vpc_cidr          = "10.50.0.0/16"
  endpoint_az_count = 2     # Endpoints in both availability zones.
  nat_enabled       = false # AWS service endpoints only; no general Internet egress.

  cpu          = 256 # 0.25 vCPU; see supported CPU/memory pairs.
  memory       = 512 # MiB per Fargate task.
  replicas     = 2
  max_replicas = 4

  # Choose ONE database profile. The application adapter and private port follow it.
  # postgres | aurora-postgresql | aurora-mysql | documentdb
  db_kind = "postgres"

  # Aurora/DocumentDB readers. RDS uses a managed secret and supports standby HA only.
  db_read_replicas = {
    # For a cluster profile: reader-a = { instance_class = "db.r6g.large", promotion_tier = 1 }
  }

  db_instance_class   = "db.t4g.medium"
  db_engine_version   = null # RDS: 17; Aurora: regional minor within PG17/MySQL8.4; DocumentDB: 5.0.0 (IAM).
  db_storage_gb       = 20   # RDS only. Cluster storage is managed by Aurora/DocumentDB.
  db_multi_az         = true # RDS standby. Aurora/DocumentDB require a named reader too.
  db_backup_days      = 14
  deletion_protection = true # Disable explicitly and review before teardown.
  skip_final_snapshot = false

  events_enabled = false # Optional: SQS, DLQ, Lambda worker and recovery timer.
  mfa_required   = true  # Require Cognito TOTP in Prod.

  # REQUIRED for Prod: set your domain and its ACM certificate in us-east-1.
  # The generated hostname is intended for Dev/demo; AWS fixes its policy to TLSv1.
  domain_name     = null
  certificate_arn = null # For a custom domain, use its ACM certificate in us-east-1.

  # Add another map entry to reuse a reference view under another URL path.
  # These two interfaces are examples, not generated business applications.
  portals = {
    tenant = { label = "Request portal", view = "requester" }
    admin  = { label = "Operations", view = "operator" }
  }
}
