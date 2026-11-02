import {MongoClient} from 'mongodb';
import {fromNodeProviderChain} from '@aws-sdk/credential-providers';
import {AppError,eventFor} from './domain.mjs';
import {localConnection} from './connection.mjs';
export async function createDocumentClient(environment=process.env,{adminSecret=null}={}) {
  const local=localConnection(environment,'TEST_MONGODB_URL',['mongodb:']);
  const options={maxPoolSize:4,minPoolSize:0,serverSelectionTimeoutMS:10000,connectTimeoutMS:10000,socketTimeoutMS:15000,retryWrites:false,readPreference:'primary'};
  if(local)return new MongoClient(local.href,{...options});
  if(!environment.DB_HOST || !environment.AWS_REGION)throw Error('missing_database_configuration');
  const host=environment.DB_HOST,port=Number(environment.DB_PORT || 27017);
  if(!/^[a-z0-9.-]+$/.test(host) || port!==27017)throw Error('invalid_documentdb_endpoint');
  const tls={tls:true,tlsCAFile:new URL('./certs/rds-ca-bundle.crt',import.meta.url).pathname};
  return new MongoClient(`mongodb://${host}:${port}/`,{...options,...tls,replicaSet:'rs0',
    ...(adminSecret ? {auth:{username:adminSecret.username,password:adminSecret.password},authSource:'admin'} : {authMechanism:'MONGODB-AWS',authSource:'$external',authMechanismProperties:{AWS_CREDENTIAL_PROVIDER:fromNodeProviderChain()}}),
  });
}
const publicRow=row=>{if(!row)return null;const {_id,...value}=row;return value;};
export function createDocumentRepository(client,{eventsEnabled=true,database='forge'}={}) {
  const db=client.db(database),requests=db.collection('requests'),outbox=db.collection('outbox'),activities=db.collection('activities');
  const filter=principal=>principal.operator?{}:{owner_id:principal.sub};
  async function transaction(operation){const session=client.startSession({causalConsistency:false});try{return await session.withTransaction(()=>operation(session),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000});}finally{await session.endSession();}}
  return {
    ping:async()=>{await db.command({ping:1});return true;},
    async create(principal,input){
      try{return await transaction(async session=>{
        const row={...input,_id:input.id,owner_id:principal.sub,status:'accepted',created_at:new Date()};
        await requests.insertOne(row,{session});
        if(eventsEnabled)await outbox.insertOne({_id:input.id,request_id:input.id,created_at:new Date(),published_at:null,attempts:0},{session});
        return {request:publicRow(row),existing:false};
      });}catch(error){
        if(error.code!==11000)throw error;
        const row=await requests.findOne({_id:input.id,owner_id:principal.sub});
        if(!row)throw new AppError(404,'not_found');
        if(row.title!==input.title || row.detail!==input.detail)throw new AppError(409,'idempotency_conflict');
        return {request:publicRow(row),existing:true};
      }
    },
    list:async principal=>(await requests.find(filter(principal)).sort({created_at:-1}).limit(200).toArray()).map(publicRow),
    async get(principal,id){const row=await requests.findOne({_id:id,...filter(principal)});if(!row)throw new AppError(404,'not_found');return publicRow(row);},
    async activities(principal){
      // Avoid global lookup results leaking across owners; requester joins only owned IDs.
      const owned=principal.operator?null:(await requests.find({owner_id:principal.sub},{projection:{_id:1}}).sort({created_at:-1}).limit(200).toArray()).map(row=>row._id);
      return (await activities.find(owned===null?{}:{request_id:{$in:owned}}).sort({created_at:-1}).limit(200).toArray()).map(publicRow);
    },
    pending:async id=>(await outbox.find({published_at:null,...(id?{request_id:id}:{})}).sort({created_at:1}).limit(100).toArray()).map(row=>eventFor({id:row.request_id})),
    markPublished:async id=>{await outbox.updateOne({_id:id},{$set:{published_at:new Date()},$inc:{attempts:1}});},
    async process(event){
      try{return await transaction(async session=>{
        if(await activities.findOne({_id:event.id},{session}))return false;
        const result=await requests.updateOne({_id:event.requestId},{$set:{status:'processed'}},{session});
        if(!result.matchedCount)throw new AppError(400,'unknown_request');
        await activities.insertOne({_id:event.id,event_id:event.id,request_id:event.requestId,kind:'request.processed',created_at:new Date()},{session});
        return true;
      });}catch(error){if(error.code===11000 && await activities.findOne({_id:event.id}))return false;throw error;}
    },
    close:()=>client.close(),
  };
}
