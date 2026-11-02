# Costs and capacity

[Home](https://github.com/danieljsaldana/goliat-forge/wiki/Home) · [Español](https://github.com/danieljsaldana/goliat-forge/wiki/Costes)

## Estimate before deployment

An AWS deployment is billable and does not scale completely to zero. There is no universal amount: region, engine, availability, traffic and retention change the total. Use [AWS Pricing Calculator](https://calculator.aws/) with your configuration before running `deploy`.

| Cost area | Review |
| --- | --- |
| API | Fargate hours, per-task CPU/memory and replica count |
| Entry | Per-environment ALB, processed capacity, CloudFront and WAF |
| Data | Engine, class, storage, applicable I/O pricing, readers, standby and backups |
| Endpoints | Five interface endpoints per environment by default; six with events/SQS. Each service is deployed in one or two AZs according to configuration |
| Operations | S3, KMS, ECR, logs and inter-AZ/service data transfer |
| Optional | NAT, Lambda, SQS, alarms and resources retained after teardown |

The S3 gateway endpoint is different from interface endpoints. One AZ for interfaces reduces their hourly base, but may add cross-AZ traffic and reduce fault tolerance. Do not assume availability is free.

## Shared and isolated resources

ECR, the WAF policy, budget and state backend belong to the installation. Dev and Prod keep their own VPC, ALB, distribution, identity, tasks and data. This avoids duplicating some services; it neither removes workload costs nor guarantees a savings percentage.

NAT is off by default. Enabling it adds hourly and processing charges; the optional NAT uses a single AZ. RDS PostgreSQL Multi-AZ adds a standby, whereas Aurora/DocumentDB add readers according to the map. None are free replicas.

## Budget and capacity

`monthly_budget_usd` sets a threshold and `alert_emails` its recipients. Activate `Installation` as a cost allocation tag in Billing so the budget filter can use it; availability is not immediate. A budget **does not stop resources**.

Size connections, IAM authentication memory, tasks, CPU target and Lambda concurrency through load testing. The application uses the writer even when readers exist. Terraform reconciles API desired capacity to configured `replicas` on apply; account for this when coordinating scaling and deployments.

## Demo and retained resources

The local demo and visual lab create no AWS resources. The Terraform demo does incur charges. Snapshots, S3 versions, ECR, backend resources and keys in their removal period may remain after destruction. Review inventory and Billing; an empty state does not mean zero account-wide spend.

[Configuration](https://github.com/danieljsaldana/goliat-forge/wiki/Configuration) · [Operations](https://github.com/danieljsaldana/goliat-forge/wiki/Operations) · [AWS pricing](https://aws.amazon.com/pricing/)
