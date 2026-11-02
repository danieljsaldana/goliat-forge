locals {
  name = "${var.common.name}-${var.environment.name}"
  app_environment = {
    AWS_REGION           = var.common.region
    EVENTS_ENABLED       = tostring(var.environment.events_enabled)
    DB_HOST              = module.database.host
    DB_NAME              = "forge"
    DB_PORT              = tostring(module.database.port)
    DB_ENGINE            = module.database.driver
    AUTH_MODE            = "cognito"
    COGNITO_USER_POOL_ID = module.identity.pool_id
    COGNITO_CLIENT_ID    = module.identity.client_id
    JWKS_FUNCTION_ARN    = module.identity.key_relay_arn
    PUBLIC_ORIGIN        = module.edge.url
    QUEUE_URL            = var.environment.events_enabled ? module.events[0].queue_url : ""
  }
}


module "network" {
  events_enabled    = var.environment.events_enabled
  source            = "../../modules/network"
  database_port     = var.environment.db_kind == "aurora-mysql" ? 3306 : var.environment.db_kind == "documentdb" ? 27017 : 5432
  name              = local.name
  region            = var.common.region
  cidr              = var.environment.vpc_cidr
  endpoint_az_count = var.environment.endpoint_az_count
  nat_enabled       = var.environment.nat_enabled
  retention         = var.common.log_retention_days
}

module "database" {
  source              = "../../modules/database"
  kind                = var.environment.db_kind
  read_replicas       = var.environment.db_read_replicas
  availability_zones  = module.network.availability_zones
  name                = local.name
  subnets             = module.network.data_subnets
  security_group      = module.network.database_sg
  instance_class      = var.environment.db_instance_class
  engine_version      = var.environment.db_engine_version
  storage_gb          = var.environment.db_storage_gb
  multi_az            = var.environment.db_multi_az
  protect             = var.environment.deletion_protection
  backup_days         = var.environment.db_backup_days
  skip_final_snapshot = var.environment.skip_final_snapshot
}

module "edge" {
  frontend_script_hashes = var.frontend_script_hashes
  source                 = "../../modules/edge"
  name                   = local.name
  region                 = var.common.region
  vpc_id                 = module.network.vpc_id
  subnets                = module.network.app_subnets
  alb_sg                 = module.network.alb_sg
  waf_arn                = var.platform.waf_arn
  protect                = var.environment.deletion_protection
  portals                = var.environment.portals
  domain_name            = var.environment.domain_name
  certificate_arn        = var.environment.certificate_arn
}

module "identity" {
  source    = "../../modules/identity"
  name      = local.name
  url       = module.edge.url
  mfa       = var.environment.mfa_required
  region    = var.common.region
  archive   = var.worker_archive
  retention = var.common.log_retention_days
}

# The event worker needs database outputs, not the API/Cognito environment map.
module "events" {
  count                 = var.environment.events_enabled ? 1 : 0
  source                = "../../modules/events"
  name                  = local.name
  region                = var.common.region
  archive               = var.worker_archive
  subnets               = module.network.app_subnets
  security_group        = module.network.worker_sg
  database_resource_ids = module.database.connect_resource_ids
  database_driver       = module.database.driver
  retention             = var.common.log_retention_days
  active                = var.activate_workloads
  environment = {
    AWS_REGION = var.common.region, DB_HOST = module.database.host, DB_NAME = "forge", DB_PORT = tostring(module.database.port), DB_ENGINE = module.database.driver
  }
}

module "service" {
  source                = "../../modules/service"
  name                  = local.name
  region                = var.common.region
  image                 = var.api_image
  key_relay_arn         = module.identity.key_relay_arn
  ecr_arn               = var.platform.ecr_arn
  subnets               = module.network.app_subnets
  security_group        = module.network.app_sg
  target_group_arn      = module.edge.target_group_arn
  database_resource_ids = module.database.connect_resource_ids
  database_driver       = module.database.driver
  admin_secret_arn      = module.database.admin_secret_arn
  database_kms_arn      = module.database.admin_secret_kms_arn
  worker_role_arn       = var.environment.events_enabled ? module.events[0].worker_role_arn : ""
  queue_arn             = var.environment.events_enabled ? module.events[0].queue_arn : null
  environment           = local.app_environment
  cpu                   = var.environment.cpu
  memory                = var.environment.memory
  replicas              = var.environment.replicas
  max_replicas          = var.environment.max_replicas
  active                = var.activate_workloads
  retention             = var.common.log_retention_days
  depends_on            = [module.edge.listener_arn]
}

resource "aws_s3_object" "config" {
  bucket                 = module.edge.bucket
  key                    = "config.json"
  content_type           = "application/json"
  cache_control          = "no-store"
  server_side_encryption = "AES256"
  content = jsonencode({
    product = "Goliat Forge", environment = var.environment.name, eventsEnabled = var.environment.events_enabled, apiBase = "/api", auth = {
      mode     = "cognito", userPoolId = module.identity.pool_id, clientId = module.identity.client_id, domain = "https://${module.identity.domain_prefix}.auth.${var.common.region}.amazoncognito.com", redirectUri = "${module.edge.url}/callback/"
    }, portals = var.environment.portals, database = { kind = var.environment.db_kind, driver = module.database.driver }
    }
  )
}

output "installation" {
  value = {
    name   = local.name
    region = var.common.region
    url    = module.edge.url
    portals = {
      for k, v in var.environment.portals : k => "${module.edge.url}/${k}/"
    }
    bucket             = module.edge.bucket
    distribution_id    = module.edge.distribution_id
    user_pool_id       = module.identity.pool_id
    cluster            = module.service.cluster
    service            = module.service.service
    migration_task     = module.service.migration_task
    app_subnets        = module.network.app_subnets
    app_security_group = module.network.app_sg
    active             = var.activate_workloads
    database           = { kind = var.environment.db_kind, host = module.database.host, port = module.database.port, readers = module.database.reader_endpoints }
  }
}
