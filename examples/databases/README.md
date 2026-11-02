# Database examples / Ejemplos de datos

Choose one complete Dev override: [PostgreSQL](postgres.tfvars), [Aurora PostgreSQL](aurora-postgresql.tfvars), [Aurora MySQL](aurora-mysql.tfvars) or [DocumentDB](documentdb.tfvars). Copy it to .local/config/dev.auto.tfvars after ./forge configure. Keep common.tfvars from that installation. Cluster examples add a billable reader; RDS uses a billable Multi-AZ standby and do not change the installation name.

Elige un override completo de Dev y cópialo a .local/config/dev.auto.tfvars después de ./forge configure. Conserva common.tfvars de esa instalación. Los clústeres añaden un lector facturable; RDS usa un standby Multi-AZ facturable. No son archivos para aplicar a una base existente sin migración: cambiar de motor no convierte los datos.

Read [database choices and IAM](../../docs/databases.en.md) / [motores, roles y réplicas](../../docs/databases.md). DocumentDB 5.0 provides MongoDB API compatibility, not a MongoDB server or full feature equivalence.
