import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { Signer } from '@aws-sdk/rds-signer';
import { AppError, eventFor } from './domain.mjs';
import { localConnection } from './connection.mjs';
export async function createMySqlPool(environment = process.env, {adminSecret = null} = {}) {
  const local = localConnection(environment, 'TEST_MYSQL_URL', ['mysql:']);
  const limits = {connectionLimit:4, maxIdle:4, idleTimeout:30000, queueLimit:20, connectTimeout:10000, timezone:'Z', multipleStatements:false};
  if (local) return mysql.createPool({...limits,host:local.hostname,port:Number(local.port || 3306),user:decodeURIComponent(local.username),password:decodeURIComponent(local.password),database:local.pathname.slice(1)});
  const {DB_HOST:host,AWS_REGION:region}=environment, user=adminSecret?.username ?? environment.DB_USER;
  if (!host || !region || !user) throw Error('missing_database_configuration');
  const port=Number(environment.DB_PORT || 3306),ca=await readFile(new URL('./certs/rds-ca-bundle.crt',import.meta.url),'utf8');
  const signer=new Signer({region,hostname:host,port,username:user});
  // The authentication switch generates a NEW token for each physical connection.
  const authPlugins=adminSecret ? {} : {mysql_clear_password:()=>async()=>Buffer.from((await signer.getAuthToken())+'\0')};
  return mysql.createPool({...limits,host,port,user,database:environment.DB_NAME || 'forge',password:adminSecret?.password,ssl:{ca,rejectUnauthorized:true},authPlugins});
}
export function createMySqlRepository(pool,{eventsEnabled=true}={}) {
  const rows=async(sql,values=[]) => (await pool.execute(sql,values))[0];
  async function transaction(operation) {
    const connection=await pool.getConnection();
    try {await connection.beginTransaction();const value=await operation(connection);await connection.commit();return value;}
    catch(error) {await connection.rollback();throw error;}
    finally {connection.release();}
  }
  async function existing(principal,input) {
    const [row]=await rows('SELECT * FROM requests WHERE id=? AND owner_id=?',[input.id,principal.sub]);
    if(!row)throw new AppError(404,'not_found');
    if(row.title!==input.title || row.detail!==input.detail)throw new AppError(409,'idempotency_conflict');
    return {request:row,existing:true};
  }
  return {
    ping:async()=>{await rows('SELECT 1');return true;},
    async create(principal,input) {
      try {return await transaction(async c=>{
        await c.execute('INSERT INTO requests(id,owner_id,title,detail) VALUES(?,?,?,?)',[input.id,principal.sub,input.title,input.detail]);
        if(eventsEnabled)await c.execute('INSERT INTO outbox(event_id,request_id) VALUES(?,?)',[input.id,input.id]);
        const [saved]=await c.execute('SELECT * FROM requests WHERE id=?',[input.id]);
        return {request:saved[0],existing:false};
      });}catch(error){if(error.code==='ER_DUP_ENTRY')return existing(principal,input);throw error;}
    },
    list:principal=>rows('SELECT * FROM requests WHERE (? OR owner_id=?) ORDER BY created_at DESC LIMIT 200',[Boolean(principal.operator),principal.sub]),
    async get(principal,id) {
      const [row]=await rows('SELECT * FROM requests WHERE id=? AND (? OR owner_id=?)',[id,Boolean(principal.operator),principal.sub]);
      if(!row)throw new AppError(404,'not_found');return row;
    },
    activities:principal=>rows('SELECT a.* FROM activities a JOIN requests r ON r.id=a.request_id WHERE (? OR r.owner_id=?) ORDER BY a.created_at DESC LIMIT 200',[Boolean(principal.operator),principal.sub]),
    async pending(id){return (await rows('SELECT request_id FROM outbox WHERE published_at IS NULL AND (? IS NULL OR request_id=?) ORDER BY created_at LIMIT 100',[id ?? null,id ?? null])).map(row=>eventFor({id:row.request_id}));},
    markPublished:async id=>{await rows('UPDATE outbox SET published_at=CURRENT_TIMESTAMP(3),attempts=attempts+1 WHERE event_id=?',[id]);},
    process:event=>transaction(async c=>{
      const [request]=await c.execute('SELECT id FROM requests WHERE id=? FOR UPDATE',[event.requestId]);
      if(!request.length)throw new AppError(400,'unknown_request');
      const [activity]=await c.execute('SELECT event_id FROM activities WHERE event_id=?',[event.id]);
      if(activity.length)return false;
      await c.execute("INSERT INTO activities(event_id,request_id,kind) VALUES(?,?,'request.processed')",[event.id,event.requestId]);
      await c.execute("UPDATE requests SET status='processed' WHERE id=?",[event.requestId]);return true;
    }),
    close:()=>pool.end(),
  };
}
