# Costs and capacity

[Español](costs.md) · [Goliat Forge](../README.md)

The PostgreSQL descriptions below cover the default profile. Aurora PostgreSQL/MySQL and DocumentDB 5.0 are selectable alternatives. See [database engines, IAM roles and replicas](databases.en.md) for ports, adapters, permissions and limits.

This installation is not free and does not fully scale to zero. Region, availability, traffic, logs and usage determine the bill. Build an estimate from the resource catalog with [AWS Pricing Calculator](https://calculator.aws/) before deployment.

## Always-on capacity

Each environment incurs ALB, RDS storage/backups, running Fargate tasks and interface-endpoint charges. Dev uses six interfaces in one AZ; Prod uses six across two AZs. Endpoint-hours matter even without application requests. The S3 gateway endpoint is different. KMS, WAF, CloudFront, logs and transfers have their own charges. NAT is disabled by default; enabling it adds hourly and data-processing costs.

## Shared scope

ECR, the Web ACL and state backend are shared while workload/data resources remain isolated. No percentage saving is promised. Activate Installation as a cost allocation tag in Billing before relying on the tagged installation budget. Notifications never stop ECS, RDS or other resources.

## Evaluation and production

The local memory demo does not consume AWS. The Terraform demo does. Dev uses one API replica and single-AZ RDS; Prod increases replicas, availability and backup retention. IAM database authentication needs additional database memory: db.t4g.small is a development starting point, not universal capacity guidance. Measure pool usage, memory and load before resizing.

Snapshots, S3 versions, images, the protected state backend and scheduled-deletion KMS keys can remain after teardown. Review inventory and Billing; destroying environment state does not imply a zero account bill.

Sources: [Fargate](https://aws.amazon.com/fargate/pricing/), [ALB](https://aws.amazon.com/elasticloadbalancing/pricing/), [RDS](https://aws.amazon.com/rds/postgresql/pricing/), [PrivateLink](https://aws.amazon.com/privatelink/pricing/), [WAF](https://aws.amazon.com/waf/pricing/), [IAM DB memory](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html). Reviewed for design on November 2, 2026; verify current rates when deploying.
