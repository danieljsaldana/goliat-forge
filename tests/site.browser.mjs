import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { createApplication } from '../apps/api/server.mjs';
import { createMemoryRepository, processEvent } from '../apps/shared/domain.mjs';
const root = resolve('.'), resources = [];
let browser, website, sourceWebsite;
async function listen(server) { await new Promise(done => server.listen(0,'127.0.0.1',done));resources.push(server);return 'http://127.0.0.1:'+server.address().port; }
before(async()=>{
 browser=await chromium.launch({headless:true});
 const directory=resolve('dist');
 website=await listen(createServer(async(req,res)=>{
  try {
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(directory,'.'+(path.endsWith('/')?path+'index.html':path));
   if(!file.startsWith(directory+sep))throw Error('invalid path');
   const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.css':'text/css','.woff2':'font/woff2'})[extname(file)]||'text/plain'});res.end(body);
  }catch{res.writeHead(404);res.end('not found');}
 }));
 sourceWebsite=await listen(createServer(async(req,res)=>{
  try {
   const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+path);
   if(!file.startsWith(root+sep)||file.split(sep).some(part=>['.git','.forge','.local','node_modules'].includes(part)))throw Error('invalid path');
   const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.htm':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.css':'text/css','.woff2':'font/woff2'})[extname(file)]||'text/plain'});res.end(body);
  }catch{res.writeHead(404);res.end('not found');}
 }));
});
after(async()=>{if(browser)await browser.close();await Promise.all(resources.map(server=>new Promise(done=>server.close(done))));});
async function metadataMock(page){
 await page.route('https://raw.githubusercontent.com/**/github-stats/stars.json*',route=>route.fulfill({json:{repository:'https://github.com/danieljsaldana/goliat-forge',count:0,checked_at:new Date().toISOString()}}));
 await page.route('https://api.github.com/repos/danieljsaldana/goliat-forge',route=>route.fulfill({json:{private:false,full_name:'danieljsaldana/goliat-forge',stargazers_count:0}}));
}
async function testPage(options){const page=await browser.newPage(options);await metadataMock(page);return page;}
function errors(page) {const values=[];page.on('pageerror',error=>values.push(error.message));page.on('console',message=>{if(message.type()==='error')values.push(message.text());});return values;}
for(const width of [320,390,768,1440])test('product website: ES/EN, diagrams and layout at '+width+'px',async()=>{
 const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});const page=await context.newPage(),failures=errors(page);await metadataMock(page);
 try{
  await page.goto(website+'/',{waitUntil:'networkidle'});await expect(page.locator('.module-card')).toHaveCount(10);
  assert.equal(await page.locator('[data-node]').count(),19);
  await expect(page.locator('[data-database]')).toHaveCount(4);
  await page.locator('[data-database="aurora-mysql"]').click();await expect(page.locator('#database-code')).toContainText('aurora-mysql');await expect(page.locator('#database-port')).toContainText('3306');
  await page.locator('[data-database="documentdb"]').click();await expect(page.locator('#database-auth')).toContainText('$external');await expect(page.locator('#database-port')).toContainText('27017');
  assert.equal((await page.request.get(new URL(await page.locator('#database-example').getAttribute('href'),website+'/').href)).status(),200);
  await page.locator('[data-database="postgres"]').click();await expect(page.locator('#database-code')).toContainText('db_read_replicas = {}');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('[data-diagram="network"]').click();await expect(page.locator('[data-node="dev-keys"]')).toBeVisible();
  await page.locator('[data-environment="prod"]').click();await page.locator('[data-node="prod-api"]').click();await expect(page.locator('#node-title')).toHaveText('ECS Fargate');
  await page.locator('[data-lang="en"]').click();await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('#node-access')).toContainText('No public IP');
  await page.locator('[data-config="prod"]').click();await expect(page.locator('#config-code')).toContainText('db_multi_az');
  await expect(page.locator('#open-diagram')).toHaveAttribute('href','diagrams/network.html?lang=en');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.goto(website+'/en/',{waitUntil:'networkidle'});await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('.module-card')).toHaveCount(10);
  assert.deepEqual(failures,[]);
 }finally{await context.close();}
});
test('optional SQS browser lab: queue outage, recovery and duplicate delivery',async()=>{
 const page=await testPage();const failures=errors(page);
 try{
  await page.goto(website+'/',{waitUntil:'networkidle'});await page.locator('#queue-online').uncheck();await page.locator('#lab-form button').click();
  await expect(page.locator('#lab-request-count')).toHaveText('1');await expect(page.locator('#lab-activity-count')).toHaveText('0');
  await page.locator('#queue-online').check();await page.locator('#lab-recover').click();await expect(page.locator('#lab-activity-count')).toHaveText('1');
  await page.locator('#lab-replay').click();await page.locator('#lab-replay').click();await expect(page.locator('#lab-request-count')).toHaveText('1');await expect(page.locator('#lab-activity-count')).toHaveText('1');assert.deepEqual(failures,[]);
 }finally{await page.close();}
});
test('standalone diagrams open directly in both languages',async()=>{
 const page=await testPage();const failures=errors(page);
 try{for(const view of ['overview','network'])for(const lang of ['es','en']){
  await page.goto(website+'/diagrams/'+view+'.html?lang='+lang,{waitUntil:'networkidle'});
  await expect(page.locator('[data-node="prod-api"]')).toBeVisible();await page.locator('[data-node="prod-api"]').click();await expect(page.locator('#node-title')).toHaveText('ECS Fargate');
 }assert.deepEqual(failures,[]);}finally{await page.close();}
});
async function reference(eventsEnabled){
 const repository=createMemoryRepository({eventsEnabled});const principal={sub:'local-demo-user',operator:true};
 for(const title of ['Preparar un entorno de pruebas','Revisar el acceso del equipo','Publicar la nueva versión'])await repository.create(principal,{id:randomUUID(),title,detail:'Ejemplo ficticio local. No son datos de clientes.'});
 const app=createApplication({repository,eventsEnabled,demo:true,authenticate:async()=>principal,sender:async event=>{await processEvent(repository,event);}});
 const {frontend_script_hashes:hashes}=JSON.parse(await readFile('.forge/artifacts/frontend-csp.json','utf8'));
 app.prependListener('request',(_req,res)=>res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'self' ${hashes.map(hash=>"'"+hash+"'").join(' ')}; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; object-src 'none'`));
 return {repository,principal,url:await listen(app)};
}
test('real Next.js export: basic mode, exact CSP, lost response retry and operator view',async()=>{
 const {url,repository,principal}=await reference(false);const page=await testPage({viewport:{width:1120,height:860}});const failures=errors(page);
 try{
  await page.goto(url,{waitUntil:'networkidle'});await expect(page.locator('tbody tr')).toHaveCount(3);
  assert.equal(await page.locator('.activities').count(),0);
  assert.match(await page.content(),/__NEXT_DATA__/);
  await mkdir('.forge/qa',{recursive:true});await page.screenshot({path:'.forge/qa/luma-panel.png'});
  let lost=true;
  await page.route('**/api/requests',async route=>{if(lost&&route.request().method()==='POST'){lost=false;await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.locator('#title').fill('<img src=x onerror=alert(1)>');await page.locator('#detail').fill('A response can be lost after the database commit.');await page.getByRole('button',{name:'Enviar solicitud'}).click();
  await expect(page.locator('.form-status')).toContainText('Se conserva el identificador');assert.equal((await repository.list(principal)).length,4);
  await page.unroute('**/api/requests');await page.getByRole('button',{name:'Enviar solicitud'}).click();await expect(page.locator('.form-status')).toContainText('Solicitud guardada');
  await expect(page.locator('tbody tr')).toHaveCount(4);assert.equal((await repository.list(principal)).length,4);assert.deepEqual(await repository.pending(),[]);assert.equal(await page.locator('td img').count(),0);
  await page.getByRole('link',{name:'Operaciones',exact:true}).click();await expect(page.locator('h1')).toHaveText('Una vista para el equipo.');assert.equal(await page.locator('form').count(),0);
  await page.setViewportSize({width:390,height:860});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  // The deliberate aborted request produces one expected network console error.
  assert.deepEqual(failures.filter(value=>!value.includes('net::ERR_FAILED')),[]);
 }finally{await page.close();}
});
test('real Next.js export: optional SQS mode exposes processing and activity',async()=>{
 const {url}=await reference(true);const page=await testPage();const failures=errors(page);
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.locator('#title').fill('An optional asynchronous request');await page.getByRole('button',{name:'Enviar solicitud'}).click();
  await expect(page.locator('.activities li')).toContainText('An optional asynchronous request');await expect(page.locator('.metrics article').nth(1)).toContainText('1');assert.deepEqual(failures,[]);
 }finally{await page.close();}
});

test('raw /site/ previews load both diagrams and the optional lab without a missing domain import',async()=>{
 const page=await testPage();const failures=errors(page);
 try {
  for(const suffix of ['html','htm']){
   await page.goto(sourceWebsite+'/site/index.'+suffix,{waitUntil:'networkidle'});
   await expect(page.locator('[data-node]')).toHaveCount(19);await expect(page.locator('.module-card')).toHaveCount(10);
   await page.locator('[data-diagram="network"]').click();await expect(page.locator('[data-node="dev-keys"]')).toBeVisible();
   await page.locator('#lab-form button').click();await expect(page.locator('#lab-request-count')).toHaveText('1');
   await page.locator('[data-config="common"]').click();await expect(page.locator('#config-code')).toContainText('monthly_budget_usd');
  }
  for(const view of ['overview','network']){await page.goto(sourceWebsite+'/site/diagrams/'+view+'.html',{waitUntil:'networkidle'});await expect(page.locator('[data-node]')).toHaveCount(19);}
  assert.deepEqual(failures,[]);
 } finally {await page.close();}
});
test('architecture remains visible with JavaScript disabled in source and built pages',async()=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
 try{
  for(const url of [website+'/',website+'/diagrams/network.html',sourceWebsite+'/site/index.html',sourceWebsite+'/site/diagrams/network.html']){
   await page.goto(url,{waitUntil:'networkidle'});await expect(page.locator('.diagram-fallback')).toBeVisible();assert.equal(await page.locator('.diagram-fallback').evaluate(image=>image.complete&&image.naturalWidth>0),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
 }finally{await context.close();}
});
test('GitHub badge refreshes an old cached zero and advertises a real repository link',async()=>{
 const context=await browser.newContext(),page=await context.newPage();const failures=errors(page);let count=1;
 await page.addInitScript(()=>sessionStorage.setItem('goliat:github-stars-snapshot:danieljsaldana/goliat-forge',JSON.stringify({at:Date.now()-86400000,snapshot:{repository:'https://github.com/danieljsaldana/goliat-forge',count:0,checked_at:new Date(Date.now()-86400000).toISOString()}})));
 await page.route('https://raw.githubusercontent.com/**/github-stats/stars.json*',route=>route.fulfill({json:{repository:'https://github.com/danieljsaldana/goliat-forge',count,checked_at:new Date(Date.now()+count*1000).toISOString()}}));
 try{
  await page.goto(website+'/',{waitUntil:'networkidle'});await expect(page.locator('[data-github-count]')).toHaveText('1');await expect(page.locator('[data-repository]').first()).toHaveAttribute('href','https://github.com/danieljsaldana/goliat-forge');
  count=2;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('[data-github-count]')).toHaveText('2');assert.deepEqual(failures,[]);
 }finally{await context.close();}
});
