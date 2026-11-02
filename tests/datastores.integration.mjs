import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMySqlPool,createMySqlRepository} from '../apps/shared/mysql.mjs';
import {createDocumentClient,createDocumentRepository} from '../apps/shared/documentdb.mjs';
import {migrateMySql,grantMySqlPrivileges} from '../apps/api/migrate-mysql.mjs';
import {migrateDocument} from '../apps/api/migrate-documentdb.mjs';
import {eventFor,processEvent,publishPending} from '../apps/shared/domain.mjs';
const owner={sub:'owner',operator:false},other={sub:'OWNER',operator:false},operator={sub:'ops',operator:true};
async function contract(api,worker,basic){
 const input={id:randomUUID(),title:'Portable data contract',detail:'Fictional request'};
 const created=await Promise.all([api.create(owner,input),api.create(owner,input)]);
 assert.deepEqual(created.map(row=>row.existing).sort(),[false,true]);
 assert.equal((await api.pending()).length,1);assert.equal((await api.list(operator)).length,1);
 assert.deepEqual(await api.list(other),[]);await assert.rejects(()=>api.get(other,input.id),{status:404});await assert.rejects(()=>api.create(other,input),{status:404});
 await assert.rejects(()=>api.create(owner,{...input,title:'Another payload'}),{status:409});
 await publishPending(api,async()=>{throw Error('offline');});assert.equal((await api.pending()).length,1);
 const processed=await Promise.all([processEvent(worker,eventFor(input)),processEvent(worker,eventFor(input))]);
 assert.deepEqual(processed.sort(),[false,true]);assert.equal((await api.get(owner,input.id)).status,'processed');
 assert.equal((await api.activities(owner)).length,1);assert.deepEqual(await api.activities(other),[]);
 await publishPending(worker,async event=>processEvent(worker,event));assert.deepEqual(await api.pending(),[]);
 const request={id:randomUUID(),title:'Basic mode',detail:'No queue required'};
 await basic.create(owner,request);assert.equal((await basic.create(owner,request)).existing,true);assert.deepEqual(await basic.pending(request.id),[]);
}
test('MySQL: persistence, retries, owner isolation, outbox and separate SQL privileges',{skip:!process.env.TEST_MYSQL_URL},async()=>{
 const url=new URL(process.env.TEST_MYSQL_URL),database=url.pathname.slice(1);assert.match(database,/_test$/);
 const env={...process.env,NODE_ENV:'test'},admin=await createMySqlPool(env),pools=[];
 try{
  for(const name of ['activities','outbox','requests'])await admin.query('DROP TABLE IF EXISTS '+name);
  await migrateMySql(admin,{iam:false,database});await migrateMySql(admin,{iam:false,database});
  const password=randomUUID().replaceAll('-','');
  for(const name of ['forge_api','forge_worker']){await admin.query(`CREATE USER IF NOT EXISTS '${name}' IDENTIFIED BY ?`,[password]);await admin.query(`ALTER USER '${name}' IDENTIFIED BY ?`,[password]);}
  const grant=await admin.getConnection();try{await grantMySqlPrivileges(grant,database);}finally{grant.release();}
  async function user(name){const value=new URL(url);value.username=name;value.password=password;const pool=await createMySqlPool({...env,TEST_MYSQL_URL:value.href});pools.push(pool);return pool;}
  const apiPool=await user('forge_api'),workerPool=await user('forge_worker');
  await contract(createMySqlRepository(apiPool),createMySqlRepository(workerPool),createMySqlRepository(apiPool,{eventsEnabled:false}));
  await assert.rejects(()=>apiPool.query("UPDATE requests SET status='accepted'"),{code:'ER_TABLEACCESS_DENIED_ERROR'});
  await assert.rejects(()=>workerPool.query("INSERT INTO requests(id,owner_id,title,detail) VALUES(?,'x','x','x')",[randomUUID()]),{code:'ER_TABLEACCESS_DENIED_ERROR'});
  await assert.rejects(()=>apiPool.query('DROP TABLE requests'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
 }finally{for(const pool of pools)await pool.end();await admin.end();}
});
test('MongoDB protocol: transactions, duplicate delivery, ownership and collection roles',{skip:!process.env.TEST_MONGODB_URL},async()=>{
 const url=new URL(process.env.TEST_MONGODB_URL),database=url.pathname.slice(1);assert.match(database,/_test$/);
 const env={...process.env,NODE_ENV:'test'},client=await createDocumentClient(env),clients=[];
 try{
  await client.db(database).dropDatabase();await migrateDocument(client,{database,iam:false});await migrateDocument(client,{database,iam:false});
  const password=randomUUID().replaceAll('-','');
  for(const user of ['forge_api','forge_worker']){
   const db=client.db(database),exists=(await db.command({usersInfo:user})).users.length;
   await db.command({[exists?'updateUser':'createUser']:user,pwd:password,roles:[{role:user+'_role',db:database}]});
  }
  async function user(name){const value=new URL(url);value.username=name;value.password=password;value.searchParams.set('authSource',database);const connection=await createDocumentClient({...env,TEST_MONGODB_URL:value.href});clients.push(connection);return connection;}
  const apiClient=await user('forge_api'),workerClient=await user('forge_worker');
  await contract(createDocumentRepository(apiClient,{database}),createDocumentRepository(workerClient,{database}),createDocumentRepository(apiClient,{database,eventsEnabled:false}));
  await assert.rejects(()=>apiClient.db(database).collection('requests').updateOne({},{$set:{status:'processed'}}),{code:13});
  await assert.rejects(()=>workerClient.db(database).collection('requests').insertOne({_id:randomUUID()}),{code:13});
  await assert.rejects(()=>apiClient.db(database).collection('requests').drop(),{code:13});
 }finally{for(const item of clients)await item.close();await client.close();}
});
