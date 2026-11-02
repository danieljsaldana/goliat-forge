# AWS demo installation / Instalación demo

This profile creates real, billable AWS infrastructure with its own name, CIDR and state. It uses the same private architecture, Cognito, RDS and application code. For evaluation-only cleanup it disables deletion protection and skips the final DB snapshot; S3/ECR/state remain protected from automatic data purge.

```
./forge configure --demo --name forgedemo --config .local/demo
./forge deploy --config .local/demo --environment demo --yes
```

For a no-AWS demo, use `npm run demo` instead. La demo local usa memoria; este perfil despliega AWS de verdad y genera costes. No comparten datos ni estado.
