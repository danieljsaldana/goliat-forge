# database

One private data profile with AWS-managed administration, IAM application access and TLS.

Un perfil de datos privado con administración gestionada por AWS, acceso IAM y TLS.

Used by the product stacks. Reuse this module through explicit inputs and outputs; provider configuration and installation tags belong to the root stack.

Se utiliza desde las pilas del producto. El módulo recibe entradas y expone salidas; los proveedores y etiquetas de instalación se configuran en la pila raíz.

## Inputs / Entradas

| Input | Required / Obligatoria | Description / Descripción |
| --- | --- | --- |
| `name` | Yes / Sí | Stable resource prefix for this module instance. |
| `subnets` | Yes / Sí | Isolated data subnet IDs in two availability zones. |
| `security_group` | Yes / Sí | Security group ID restricting this workload or database. |
| `availability_zones` | Yes / Sí | Two distinct AZ names matching the private data subnets. |
| `kind` | No | One data engine: postgres, aurora-postgresql, aurora-mysql or documentdb. |
| `instance_class` | No | Writer DB instance class; null selects the profile default. |
| `storage_gb` | Yes / Sí | Initial RDS PostgreSQL storage in GiB; cluster storage is managed by AWS. |
| `max_storage_gb` | No | RDS storage ceiling; null uses a bounded triple allocation, or disables autoscaling when too close to 65536 GiB. |
| `final_snapshot_identifier` | No | Optional unique final snapshot name. Change it before a later teardown if the default snapshot already exists. |
| `multi_az` | Yes / Sí | RDS standby, or require cluster reader compute outside the writer AZ. |
| `protect` | Yes / Sí | Enable deletion protection; disable explicitly before reviewed teardown. |
| `backup_days` | Yes / Sí | Automated database backup retention in whole days (1–35). |
| `skip_final_snapshot` | Yes / Sí | Explicitly skip the final database snapshot during teardown when true. |
| `engine_version` | No | Optional supported engine version. DocumentDB IAM is pinned to 5.0.0. |
| `read_replicas` | No | Stable reader names, optional instance classes, and cluster failover priorities (0–15). |

Types, defaults and validation rules: [variables.tf](variables.tf). Tipos, valores iniciales y validaciones: [variables.tf](variables.tf).

## Outputs / Salidas

- `kind`: Selected database profile.
- `driver`: Matching application database adapter.
- `port`: Selected private database TCP port.
- `host`: Writer endpoint used by the reference app for reads and writes.
- `resource_id`: Database resource ID for inventory and access binding.
- `admin_secret_arn`: AWS-managed administrator secret ARN for migration only.
- `kms_arn`: Customer-managed database encryption key ARN.
- `admin_secret_kms_arn`: DocumentDB uses the AWS-managed Secrets Manager key with this provider version, not the database CMK.
- `reader_endpoints`: Not used by the reference app: writer reads preserve read-after-write consistency.
- `connect_resource_ids`: SQL IAM connect targets; empty for DocumentDB role mapping.

[Output expressions / Expresiones de salida](outputs.tf) · [Product configuration / Configuración del producto](../../docs/configuration.md)
