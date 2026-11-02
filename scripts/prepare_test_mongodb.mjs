/** Initialize only the disposable loopback MongoDB replica set used in CI. */
import {MongoClient} from 'mongodb';
import {localConnection} from '../apps/shared/connection.mjs';
const url=localConnection(process.env,'TEST_MONGODB_URL',['mongodb:']);
if(!url || !url.pathname.endsWith('_test'))throw Error('disposable_local_test_database_required');
const deadline=Date.now()+90000;
while(true){
 const client=new MongoClient(url.href,{serverSelectionTimeoutMS:2000,connectTimeoutMS:2000,directConnection:true});
 try{
  const admin=client.db('admin');
  try{await admin.command({replSetGetStatus:1});}catch(error){if(error.code!==94)throw error;await admin.command({replSetInitiate:{_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}});}
  if(Date.now()>deadline)throw Error('test_mongodb_startup_failed');
  if((await admin.command({hello:1})).isWritablePrimary){console.log('Disposable authenticated MongoDB test replica set is ready.');break;}
 }catch(error){if(Date.now()>deadline)throw Error('test_mongodb_startup_failed');}
 finally{await client.close();}
 await new Promise(resolve=>setTimeout(resolve,500));
}
