import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { Signer } from '@aws-sdk/rds-signer';
import {localConnection} from './connection.mjs';
import { AppError, eventFor } from './domain.mjs';
export async function createPool(environment = process.env, { adminSecret = null } = {}) {
  const local = localConnection(environment,'TEST_DATABASE_URL',['postgresql:','postgres:']);
  if (local) return new pg.Pool({connectionString:local.href,max:4,connectionTimeoutMillis:5000,query_timeout:5000});
  if (!environment.DB_HOST || !environment.AWS_REGION) throw Error('missing_database_configuration');
  const ca = await readFile(new URL('./certs/rds-ca-bundle.crt', import.meta.url), 'utf8');
  const user = adminSecret?.username ?? environment.DB_USER;
  if (!user) throw Error('missing_database_user');
  const signer = new Signer({ region: environment.AWS_REGION, hostname: environment.DB_HOST, port: 5432, username: user });
  return new pg.Pool({ host: environment.DB_HOST, port: 5432, database: environment.DB_NAME || 'forge', user,
    password: adminSecret ? adminSecret.password : () => signer.getAuthToken(),
    ssl: { ca, rejectUnauthorized: true }, max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000, query_timeout: 5000 });
}
export function createPostgresRepository(pool, { eventsEnabled = true } = {}) {
  async function transaction(operation) {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await operation(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  return {
    ping: async () => { await pool.query('SELECT 1'); return true; },
    async create(principal, input) {
      return transaction(async client => {
        const result = await client.query('INSERT INTO forge.requests(id,owner_id,title,detail) VALUES($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING RETURNING *', [input.id, principal.sub, input.title, input.detail]);
        if (!result.rowCount) {
          const existing = await client.query('SELECT * FROM forge.requests WHERE id=$1 AND owner_id=$2', [input.id, principal.sub]);
          const row = existing.rows[0];
          if (!row) throw new AppError(404, 'not_found');
          if (row.title !== input.title || row.detail !== input.detail) throw new AppError(409, 'idempotency_conflict');
          return { request: row, existing: true };
        }
        if (eventsEnabled) await client.query('INSERT INTO forge.outbox(event_id,request_id) VALUES($1,$1)', [input.id]);
        return { request: result.rows[0], existing: false };
      });
    },
    async list(principal) {
      return (await pool.query('SELECT * FROM forge.requests WHERE ($1::boolean OR owner_id=$2) ORDER BY created_at DESC LIMIT 200', [Boolean(principal.operator), principal.sub])).rows;
    },
    async get(principal, id) {
      const result = await pool.query('SELECT * FROM forge.requests WHERE id=$1 AND ($2::boolean OR owner_id=$3)', [id, Boolean(principal.operator), principal.sub]);
      if (!result.rowCount) throw new AppError(404, 'not_found');
      return result.rows[0];
    },
    async activities(principal) {
      return (await pool.query('SELECT a.* FROM forge.activities a JOIN forge.requests r ON r.id=a.request_id WHERE ($1::boolean OR r.owner_id=$2) ORDER BY a.created_at DESC LIMIT 200', [Boolean(principal.operator), principal.sub])).rows;
    },
    async pending(id) {
      return (await pool.query('SELECT event_id AS id,request_id FROM forge.outbox WHERE published_at IS NULL AND ($1::uuid IS NULL OR request_id=$1) ORDER BY created_at LIMIT 100', [id ?? null])).rows.map(r => eventFor({ id: r.request_id }));
    },
    async markPublished(id) { await pool.query('UPDATE forge.outbox SET published_at=now(),attempts=attempts+1 WHERE event_id=$1', [id]); },
    async process(event) {
      return transaction(async client => {
        const row = await client.query('SELECT id FROM forge.requests WHERE id=$1 FOR UPDATE', [event.requestId]);
        if (!row.rowCount) throw new AppError(400, 'unknown_request');
        const inserted = await client.query("INSERT INTO forge.activities(event_id,request_id,kind) VALUES($1,$2,'request.processed') ON CONFLICT (event_id) DO NOTHING RETURNING event_id", [event.id, event.requestId]);
        if (inserted.rowCount) await client.query("UPDATE forge.requests SET status='processed' WHERE id=$1", [event.requestId]);
        return Boolean(inserted.rowCount);
      });
    },
    close: () => pool.end(),
  };
}
