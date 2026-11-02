import {test} from 'node:test';
import assert from 'node:assert/strict';
import {databaseEngine,localConnection} from '../apps/shared/connection.mjs';
import {createDocumentClient} from '../apps/shared/documentdb.mjs';
import {Signer} from '@aws-sdk/rds-signer';
import {createMySqlPool} from '../apps/shared/mysql.mjs';
test('all local database overrides reject AWS processes, public hosts and wrong protocols',()=>{
 for(const [key,protocol] of [['TEST_DATABASE_URL','postgresql'],['TEST_MYSQL_URL','mysql'],['TEST_MONGODB_URL','mongodb']]){
  const valid=protocol+'://127.0.0.1/forge_test';
  assert.equal(localConnection({[key]:valid},key,[protocol+':']).hostname,'127.0.0.1');
  for(const mode of [{NODE_ENV:'production'},{AWS_EXECUTION_ENV:'AWS_Lambda_nodejs24.x'},{ECS_CONTAINER_METADATA_URI:'metadata'},{ECS_CONTAINER_METADATA_URI_V4:'metadata'}])assert.throws(()=>localConnection({...mode,[key]:valid},key,[protocol+':']),/test_database_forbidden/);
  assert.throws(()=>localConnection({[key]:protocol+'://public.example/forge_test'},key,[protocol+':']),/test_database_must_be_loopback/);
  assert.throws(()=>localConnection({[key]:'https://127.0.0.1/forge_test'},key,[protocol+':']),/test_database_must_be_loopback/);
 }
 assert.throws(()=>databaseEngine({DB_ENGINE:'unknown'}),/unsupported_database_engine/);
});
test('DocumentDB runtime defaults to verified TLS, IAM identity and primary reads without a stored password',async()=>{
 const client=await createDocumentClient({DB_HOST:'database.example.invalid',AWS_REGION:'eu-west-1'});
 try{
  assert.equal(client.options.tls,true);assert.equal(client.options.credentials.mechanism,'MONGODB-AWS');assert.equal(client.options.credentials.source,'$external');
  assert.equal(Boolean(client.options.credentials.password),false);assert.equal(typeof client.options.credentials.mechanismProperties.AWS_CREDENTIAL_PROVIDER,'function');
  assert.equal(client.options.retryWrites,false);assert.equal(client.options.readPreference.mode,'primary');assert.notEqual(client.options.tlsAllowInvalidCertificates,true);assert.notEqual(client.options.tlsAllowInvalidHostnames,true);
 }finally{await client.close();}
});
test('MySQL runtime enables IAM only on a validated TLS connection and retains no static password',async()=>{
 const pool=await createMySqlPool({DB_HOST:'database.example.invalid',AWS_REGION:'eu-west-1',DB_USER:'forge_api'});
 try{
  const options=pool.pool.config.connectionConfig;
  assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.password,undefined);assert.equal(typeof options.authPlugins.mysql_clear_password,'function');
 }finally{await pool.end();}
});

test('MySQL IAM authentication regenerates the token for every physical connection',async()=>{
 const original=Signer.prototype.getAuthToken;let calls=0;
 Signer.prototype.getAuthToken=async()=>`temporary-token-${++calls}`;
 let pool;
 try{
  pool=await createMySqlPool({DB_HOST:'database.example.invalid',AWS_REGION:'eu-west-1',DB_USER:'forge_api'});
  const plugin=pool.pool.config.connectionConfig.authPlugins.mysql_clear_password;
  assert.equal((await plugin()()).toString(),'temporary-token-1\0');
  assert.equal((await plugin()()).toString(),'temporary-token-2\0');assert.equal(calls,2);
 }finally{Signer.prototype.getAuthToken=original;if(pool)await pool.end();}
});
