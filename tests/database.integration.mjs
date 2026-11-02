import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPool,createPostgresRepository} from '../apps/shared/database.mjs';
import {migrate} from '../apps/api/migrate.mjs';
import {eventFor,publishPending,processEvent} from '../apps/shared/domain.mjs';
const connection=process.env.TEST_DATABASE_URL;
test('PostgreSQL: atomic outbox, concurrent idempotency, ownership and least-privilege SQL roles',{skip:!connection},async()=>{
 const url=new URL(connection);
 assert.match(url.pathname,/_test$/,'Use a dedicated disposable test database');
 const admin=await createPool({...process.env,NODE_ENV:'test',TEST_DATABASE_URL:connection});
 const pools=[];
 try{
  await admin.query('DROP SCHEMA IF EXISTS forge CASCADE');
  await admin.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='rds_iam') THEN CREATE ROLE rds_iam; END IF; END $$");
  await migrate(admin);await migrate(admin);
  async function user(name){const value=new URL(connection);value.username=name;const password=randomUUID().replaceAll('-','');const sql=await admin.query("SELECT format('ALTER ROLE %I PASSWORD %L',$1::text,$2::text) AS statement",[name,password]);await admin.query(sql.rows[0].statement);value.password=password;const pool=await createPool({...process.env,NODE_ENV:'test',TEST_DATABASE_URL:value.href});pools.push(pool);return pool;}
  const apiPool=await user('forge_api'),workerPool=await user('forge_worker');
  const api=createPostgresRepository(apiPool),worker=createPostgresRepository(workerPool);
  const owner={sub:'owner',operator:false},other={sub:'other',operator:false},operator={sub:'ops',operator:true};
  const input={id:randomUUID(),title:'A real SQL transaction',detail:'Fictional test data'};
  const concurrent=await Promise.all([api.create(owner,input),api.create(owner,input)]);
  assert.deepEqual(concurrent.map(r=>r.existing).sort(),[false,true]);
  assert.equal((await api.pending()).length,1);
  await assert.rejects(()=>api.create(owner,{...input,title:'Different payload'}),{status:409});
  await assert.rejects(()=>api.create(other,input),{status:404});
  assert.deepEqual(await api.list(other),[]);await assert.rejects(()=>api.get(other,input.id),{status:404});
  const delivery=await publishPending(api,async()=>{throw Error('Queue offline');},input.id);
  assert.equal(delivery[0].published,false);assert.equal((await api.pending()).length,1);
  const processed=await Promise.all([processEvent(worker,eventFor(input)),processEvent(worker,eventFor(input))]);
  assert.deepEqual(processed.sort(),[false,true]);
  assert.equal((await api.activities(owner)).length,1);assert.deepEqual(await api.activities(other),[]);
  assert.equal((await api.list(operator)).length,1);assert.equal((await api.get(owner,input.id)).status,'processed');
  await publishPending(worker,async event=>processEvent(worker,event));
  assert.equal((await api.pending()).length,0);assert.equal((await api.activities(owner)).length,1);
  const simple=createPostgresRepository(apiPool,{eventsEnabled:false}),basic={id:randomUUID(),title:'No events needed',detail:'Basic synchronous path'};
  assert.equal((await simple.create(owner,basic)).existing,false);assert.equal((await simple.create(owner,basic)).existing,true);
  assert.deepEqual(await simple.pending(basic.id),[]);
  await assert.rejects(()=>apiPool.query("UPDATE forge.requests SET status='accepted'"),{code:'42501'});
  await assert.rejects(()=>workerPool.query("INSERT INTO forge.requests(id,owner_id,title,detail) VALUES($1,'x','x','x')",[randomUUID()]),{code:'42501'});
  await assert.rejects(()=>apiPool.query('DROP TABLE forge.requests'),{code:'42501'});
 }finally{for(const pool of pools)await pool.end();await admin.end();}
});
