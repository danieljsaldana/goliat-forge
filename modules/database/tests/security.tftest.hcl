mock_provider "aws" {

  source = "../../tests/mocks"

}

variables {
  availability_zones  = ["eu-west-1a", "eu-west-1b"]
  name                = "forge-dev"
  subnets             = ["subnet-00000000000000001", "subnet-00000000000000002"]
  security_group      = "sg-00000000000000001"
  instance_class      = "db.t4g.small"
  storage_gb          = 20
  multi_az            = false
  protect             = true
  backup_days         = 7
  skip_final_snapshot = false
  engine_version      = "17"

}

run "private_managed_credentials" {
  command = apply
  assert {
    condition     = !aws_db_instance.this[0].publicly_accessible && aws_db_instance.this[0].storage_encrypted && aws_db_instance.this[0].iam_database_authentication_enabled
    error_message = "RDS must be private, encrypted and accept IAM authentication."

  }

  assert {
    condition     = aws_db_instance.this[0].manage_master_user_password && aws_db_instance.this[0].password == null
    error_message = "The database master password must be managed by RDS, not Terraform."

  }

  assert {
    condition     = aws_db_instance.this[0].deletion_protection && !aws_db_instance.this[0].skip_final_snapshot
    error_message = "Data deletion must be explicitly reviewed."

  }


}


run "aurora_postgresql_readers" {
  command = apply
  variables {
    kind           = "aurora-postgresql"
    engine_version = null
    multi_az       = true
    read_replicas  = { reader-a = { instance_class = "db.r6g.large", promotion_tier = 2 } }
  }
  assert {
    condition     = length(aws_db_instance.this) == 0 && length(aws_rds_cluster.aurora) == 1 && length(aws_rds_cluster_instance.reader) == 1 && aws_rds_cluster_instance.reader["reader-a"].availability_zone == "eu-west-1b"
    error_message = "Aurora must replace the RDS profile with a private cluster and a reader in another AZ."
  }
  assert {
    condition     = aws_rds_cluster.aurora[0].iam_database_authentication_enabled && aws_rds_cluster.aurora[0].manage_master_user_password && aws_rds_cluster_instance.reader["reader-a"].promotion_tier == 2
    error_message = "Aurora must use IAM, a managed master secret and the configured failover priority."
  }
}
run "aurora_mysql_private_port" {
  command = apply
  variables {
    kind           = "aurora-mysql"
    engine_version = null
  }
  assert {
    condition     = output.driver == "mysql" && output.port == 3306 && aws_rds_cluster.aurora[0].port == 3306 && !aws_rds_cluster_instance.writer[0].publicly_accessible
    error_message = "The MySQL profile needs the MySQL adapter and private port 3306."
  }
}
run "documentdb_passwordless_application" {
  command = apply
  variables {
    kind           = "documentdb"
    engine_version = "5.0.0"
    multi_az       = true
    read_replicas  = { reader-a = {} }
  }
  assert {
    condition     = length(aws_db_instance.this) == 0 && length(aws_rds_cluster.aurora) == 0 && aws_docdb_cluster.this[0].manage_master_user_password && aws_docdb_cluster.this[0].master_password == null
    error_message = "DocumentDB must manage its administrator secret without a password in Terraform."
  }
  assert {
    condition     = output.driver == "documentdb" && output.port == 27017 && length(output.connect_resource_ids) == 0 && aws_docdb_cluster_instance.reader["reader-a"].availability_zone == "eu-west-1b"
    error_message = "DocumentDB uses IAM identity mapping, not a fake rds-db:connect permission."
  }
}
run "reject_rds_readers_with_managed_secret" {
  command = plan
  variables { read_replicas = { reader-a = {} } }
  expect_failures = [var.read_replicas]
}
run "reject_cluster_multi_az_without_reader" {
  command = plan
  variables {
    kind           = "aurora-postgresql"
    engine_version = null
    multi_az       = true
  }
  expect_failures = [var.read_replicas]
}
run "reject_documentdb_version_without_iam" {
  command = plan
  variables {
    kind           = "documentdb"
    engine_version = "8.0.0"
  }
  expect_failures = [var.engine_version]
}

run "reject_cluster_multi_az_same_zone" {
  command = plan
  variables {
    kind           = "aurora-postgresql"
    engine_version = null
    multi_az       = true
    read_replicas  = { reader-a = { availability_zone = "eu-west-1a" } }
  }
  expect_failures = [var.read_replicas]
}
