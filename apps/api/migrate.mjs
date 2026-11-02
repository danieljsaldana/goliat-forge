import { readFile } from 'node:fs/promises';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import {createMySqlPool} from '../shared/mysql.mjs';
import {createDocumentClient} from '../shared/documentdb.mjs';
import {databaseEngine} from '../shared/connection.mjs';
import {migrateMySql} from './migrate-mysql.mjs';
import {migrateDocument} from './migrate-documentdb.mjs';
import { createPool } from '../shared/database.mjs';
export async function migrate(pool, { iam = true } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(64289131)');
    await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
    if (iam) {
      await client.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='forge_api') THEN CREATE ROLE forge_api LOGIN; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='forge_worker') THEN CREATE ROLE forge_worker LOGIN; END IF; END $$;");
      await client.query('GRANT rds_iam TO forge_api,forge_worker');
      await client.query('GRANT USAGE ON SCHEMA forge TO forge_api,forge_worker');
      await client.query('GRANT SELECT,INSERT ON forge.requests TO forge_api');
      await client.query('GRANT SELECT ON forge.requests TO forge_worker');
      await client.query('GRANT UPDATE(status) ON forge.requests TO forge_worker');
      await client.query('GRANT SELECT ON forge.activities TO forge_api');
      await client.query('GRANT SELECT,INSERT ON forge.activities TO forge_worker');
      await client.query('GRANT SELECT,INSERT,UPDATE ON forge.outbox TO forge_api');
      await client.query('GRANT SELECT,UPDATE ON forge.outbox TO forge_worker');
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function main() {
  if (!process.env.ADMIN_SECRET_ARN) throw Error('missing_managed_secret_arn');
  const result = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: process.env.ADMIN_SECRET_ARN }));
  const secret = JSON.parse(result.SecretString);
  if (typeof secret.username !== 'string' || typeof secret.password !== 'string') throw Error('invalid_managed_secret');
  const engine=databaseEngine();
  if(engine==='documentdb'){
    const client=await createDocumentClient(process.env,{adminSecret:secret});
    try{await migrateDocument(client,{database:process.env.DB_NAME || 'forge',apiRoleArn:process.env.DB_API_ROLE_ARN,workerRoleArn:process.env.DB_WORKER_ROLE_ARN || ''});}finally{await client.close();}
  }else{
    const pool=engine==='mysql'?await createMySqlPool(process.env,{adminSecret:secret}):await createPool(process.env,{adminSecret:secret});
    try{if(engine==='mysql')await migrateMySql(pool,{database:process.env.DB_NAME || 'forge'});else await migrate(pool);}finally{await pool.end();}
  }
  console.log(JSON.stringify({migration:'complete',engine}));
}
if (import.meta.url === new URL(process.argv[1] || '', 'file:').href) main().catch(() => { console.error('Database migration failed; inspect private task logs. Credentials are never logged.'); process.exitCode = 1; });
