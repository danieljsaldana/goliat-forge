mock_provider "aws" {

  source = "../../tests/mocks"

}

mock_provider "aws" {
  alias  = "edge"
  source = "../../tests/mocks"

}

variables {

  common = {
    name = "forge", region = "eu-west-1"
  }

  platform = {
    name = "forge", region = "eu-west-1", ecr_url = "000000000000.dkr.ecr.eu-west-1.amazonaws.com/forge/api", ecr_arn = "arn:aws:ecr:eu-west-1:000000000000:repository/forge/api", waf_arn = "arn:aws:wafv2:us-east-1:000000000000:global/webacl/example/00000000-0000-4000-8000-000000000000"
  }

  api_image      = "000000000000.dkr.ecr.eu-west-1.amazonaws.com/forge/api@sha256:0000000000000000000000000000000000000000000000000000000000000000"
  worker_archive = "../../.forge/test-fixtures/worker.zip"

}

run "dev_private_platform" {

  command = apply
  variables {
    environment = {
      name = "dev", vpc_cidr = "10.40.0.0/16"
    }

  }

  assert {
    condition     = output.installation.active == false
    error_message = "Initial installation must not run the API before database bootstrap."

  }

  assert {
    condition     = length(module.events) == 0 && !jsondecode(aws_s3_object.config.content).eventsEnabled
    error_message = "The base application must work without provisioning business events."
  }

  assert {
    condition     = jsondecode(aws_s3_object.config.content).auth.mode == "cognito"
    error_message = "Cloud application must require Cognito."

  }


}

run "reject_prod_without_domain" {

  command = plan
  variables {
    environment = {
      name = "prod", vpc_cidr = "10.50.0.0/16"
    }

  }

  expect_failures = [var.environment]

}

run "reject_unsafe_portal_path" {

  command = plan
  variables {
    environment = {
      name = "dev", vpc_cidr = "10.40.0.0/16", portals = {
        api = {
          label = "Reserved", view = "requester"
        }

      }

    }

  }

  expect_failures = [var.environment]

}

run "reject_wrong_platform" {

  command = plan
  variables {

    environment = {
      name = "dev", vpc_cidr = "10.40.0.0/16"
    }

    common = {
      name = "other", region = "eu-west-1"
    }


  }

  expect_failures = [var.platform]

}


run "optional_events" {
  command = apply
  variables {
    environment = { name = "dev", vpc_cidr = "10.40.0.0/16", events_enabled = true }
  }
  assert {
    condition     = length(module.events) == 1 && jsondecode(aws_s3_object.config.content).eventsEnabled
    error_message = "Opting in must provision the event module and expose that mode to the frontend."
  }
}

run "documentdb_with_optional_worker" {
  command = apply
  variables {
    environment = { name = "dev", vpc_cidr = "10.40.0.0/16", db_kind = "documentdb", events_enabled = true }
  }
  assert {
    condition     = output.installation.database.kind == "documentdb" && output.installation.database.port == 27017 && jsondecode(aws_s3_object.config.content).database.driver == "documentdb"
    error_message = "The complete root must wire DocumentDB through the API, migration, network and optional worker."
  }
}
run "aurora_mysql_complete_application" {
  command = apply
  variables {
    environment = { name = "dev", vpc_cidr = "10.40.0.0/16", db_kind = "aurora-mysql", db_multi_az = true, db_read_replicas = { reader-a = {} } }
  }
  assert {
    condition     = output.installation.database.port == 3306 && length(output.installation.database.readers) == 1 && jsondecode(aws_s3_object.config.content).database.driver == "mysql"
    error_message = "Aurora MySQL must expose the proper adapter and reader information."
  }
}
