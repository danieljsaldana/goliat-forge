import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { AppError, createMemoryRepository, validateRequest, eventFor, publishPending, processEvent } from '../apps/shared/domain.mjs';
import { createApplication } from '../apps/api/server.mjs';
import { createWorker } from '../apps/worker/handler.mjs';
import { assertDemoAllowed, createAuthenticator } from '../apps/api/auth.mjs';
import { createKeyRelay } from '../apps/identity/keys.mjs';
import { createPrivateKeyFetcher } from '../apps/api/keys.mjs';
const owner = {sub:'owner',operator:false}, other={sub:'other',operator:false}, operator={sub:'operator',operator:true};
const request = () => ({id:randomUUID(),title:'Prepare an environment',detail:'Reference request'});

test('creation persists the outbox before delivery, survives failure and processes a replay once',async()=>{
 const repo=createMemoryRepository(),input=request();
 const saved=await repo.create(owner,validateRequest(input));
 assert.equal(saved.existing,false);
 assert.equal((await repo.pending()).length,1);
 assert.equal((await publishPending(repo,async()=>{throw Error('offline');},input.id))[0].published,false);
 assert.equal((await repo.list(owner)).length,1);
 const worker=createWorker(repo,async event=>processEvent(repo,event));
 await worker({kind:'outbox-recovery'});
 assert.equal((await repo.pending()).length,0);
 assert.equal((await repo.activities(owner)).length,1);
 await processEvent(repo,eventFor(input));
 assert.equal((await repo.activities(owner)).length,1);
 assert.equal((await repo.get(owner,input.id)).status,'processed');
});
test('owner isolation applies to lists, details, activities and duplicate identifiers',async()=>{
 const repo=createMemoryRepository(),input=request();await repo.create(owner,input);await processEvent(repo,eventFor(input));
 assert.deepEqual(await repo.list(other),[]);assert.deepEqual(await repo.activities(other),[]);
 await assert.rejects(()=>repo.get(other,input.id),{status:404});
 await assert.rejects(()=>repo.create(other,input),{status:404});
 assert.equal((await repo.list(operator)).length,1);assert.equal((await repo.activities(operator)).length,1);
 assert.equal((await repo.create(owner,input)).existing,true);
 await assert.rejects(()=>repo.create(owner,{...input,title:'Changed'}),{status:409});
});
test('a bad queue record is retried without repeating successful activity',async()=>{
 const repo=createMemoryRepository(),input=request();await repo.create(owner,input);
 const worker=createWorker(repo,async()=>{});
 const event={Records:[{messageId:'good',body:JSON.stringify(eventFor(input))},{messageId:'bad',body:'{' }]};
 assert.deepEqual(await worker(event),{batchItemFailures:[{itemIdentifier:'bad'}]});
 assert.deepEqual(await worker(event),{batchItemFailures:[{itemIdentifier:'bad'}]});
 assert.equal((await repo.activities(owner)).length,1);
});
test('the HTTP API requires identity and confirms a saved request during a queue outage',async()=>{
 const repo=createMemoryRepository();
 const app=createApplication({repository:repo,sender:async()=>{throw Error('offline');},authenticate:async header=>{if(header!=='Bearer allowed')throw new AppError(401,'unauthorized');return owner;}});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const url='http://127.0.0.1:'+app.address().port;
 try{
  assert.equal((await fetch(url+'/api/requests')).status,401);
  const input=request(), options={method:'POST',headers:{Authorization:'Bearer allowed','Content-Type':'application/json'},body:JSON.stringify(input)};
  const response=await fetch(url+'/api/requests',options);
  assert.equal(response.status,202);assert.equal((await response.json()).delivery,'pending');
  assert.equal((await fetch(url+'/api/requests',options)).status,200);
  assert.equal((await repo.list(owner)).length,1);
  assert.equal((await fetch(url+'/api/requests',{...options,body:'{"id":"bad"}'})).status,400);
 }finally{await new Promise(resolve=>app.close(resolve));}
});
test('demo mode cannot be enabled on a public bind or in an AWS/production process',()=>{
 for(const [env,host] of [[{},'0.0.0.0'],[{NODE_ENV:'production'},'127.0.0.1'],[{AWS_EXECUTION_ENV:'AWS_Lambda_nodejs24.x'},'127.0.0.1'],[{ECS_CONTAINER_METADATA_URI_V4:'metadata'},'127.0.0.1']]) assert.throws(()=>assertDemoAllowed(env,host));
 assert.doesNotThrow(()=>assertDemoAllowed({},'127.0.0.1'));
});
test('the key relay can only fetch the configured Cognito issuer and rejects private key material',async()=>{
 const calls=[];
 const relay=createKeyRelay({poolId:'eu-west-1_Example',region:'eu-west-1',fetcher:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({keys:[{kid:'one',kty:'RSA',n:'public',e:'AQAB'}]})};}});
 assert.equal((await relay({url:'https://untrusted.example/'})).keys.length,1);
 assert.equal(calls[0].url,'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Example/.well-known/jwks.json');
 assert.equal(calls[0].options.redirect,'error');
 const invalid=createKeyRelay({poolId:'eu-west-1_Example',region:'eu-west-1',fetcher:async()=>({ok:true,json:async()=>({keys:[{kid:'one',kty:'RSA',n:'n',e:'e',d:'private'}]})})});
 await assert.rejects(()=>invalid({}));
 const fetcher=createPrivateKeyFetcher({userPoolId:'eu-west-1_Example',region:'eu-west-1',functionArn:'example',client:{send(){assert.fail('must not invoke for another issuer');}}});
 await assert.rejects(()=>fetcher.fetch('https://untrusted.example/keys'));
});
test('Cognito verification through the private relay validates signature, expiry, pool and client',async()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
 const client={send:async()=>({Payload:Buffer.from(JSON.stringify({keys:[jwk]}))})};
 const authenticate=createAuthenticator({userPoolId:'eu-west-1_Example',clientId:'exampleclient',region:'eu-west-1',keyFunctionArn:'example',keyClient:client});
 const claims={sub:'requester',iss:'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Example',token_use:'access',client_id:'exampleclient',exp:Math.floor(Date.now()/1000)+300,iat:Math.floor(Date.now()/1000),'cognito:groups':['Operators']};
 const jwt=overrides=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid:jwk.kid})).toString('base64url');const p=Buffer.from(JSON.stringify({...claims,...overrides})).toString('base64url');return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');};
 assert.deepEqual(await authenticate('Bearer '+jwt({})),{sub:'requester',operator:true});
 for(const invalid of [{client_id:'other'},{token_use:'id'},{exp:1},{iss:'https://untrusted.example'}])await assert.rejects(()=>authenticate('Bearer '+jwt(invalid)),{status:401});
 await assert.rejects(()=>authenticate(undefined),{status:401});
});

test('the basic HTTP application saves requests without queue calls or pending outbox rows',async()=>{
 const repo=createMemoryRepository({eventsEnabled:false});
 const app=createApplication({repository:repo,sender:async()=>assert.fail('queue must not be used'),authenticate:async()=>owner,eventsEnabled:false});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try {
  const input=request(),url='http://127.0.0.1:'+app.address().port+'/api/requests';
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)};
  const response=await fetch(url,options);assert.equal(response.status,201);assert.equal((await response.json()).delivery,'disabled');
  assert.equal((await fetch(url,options)).status,200);
  assert.equal((await repo.list(owner)).length,1);assert.deepEqual(await repo.pending(),[]);
 } finally { await new Promise(resolve=>app.close(resolve)); }
});
