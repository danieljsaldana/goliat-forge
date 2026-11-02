import {createHeroArchitecture} from './hero-architecture.js';
import {createDiagram} from './diagram.js';
import {createDatabaseExplorer} from './databases.js';
import {getStarSnapshot,formatStarCount} from './github.js';
const $=id=>document.getElementById(id),state={locale:'es',dictionaries:{},product:{},snapshot:null,starFlight:null,flow:0};
async function json(path){try{const response=await fetch(new URL(path,import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(4000)});return response.ok?await response.json():null;}catch{return null;}}
const [es,en,product,initialSnapshot]=await Promise.all([json('./content/es.json'),json('./content/en.json'),json('./content/product.json'),json('./content/github-stars.json')]);
state.dictionaries={es,en};state.product=product||{};
const requested=new URLSearchParams(location.search).get('lang')||(location.pathname.includes('/en/')?'en':null);
try{state.locale=requested||localStorage.getItem('forge:language')||'es';}catch{state.locale=requested||'es';}
if(!['es','en'].includes(state.locale)||!state.dictionaries[state.locale])state.locale='es';
let lab=null;
const modules=[
 ['network','network','Red privada','Private network','Subredes de aplicación y datos, SG, flow logs y endpoints AWS.','Application and data subnets, security groups, flow logs and AWS endpoints.'],
 ['edge','globe','Entrada pública','Public entry','CloudFront, ALB interno, OAC y S3 privado para el frontend.','CloudFront, internal ALB, OAC and private frontend S3.'],
 ['service','container','Contenedores','Containers','Fargate privado, roles por tarea, despliegue y escalado por CPU.','Private Fargate, task roles, deployment and CPU autoscaling.'],
 ['database','database','Datos y secretos','Data and secrets','RDS, Aurora PostgreSQL/MySQL o DocumentDB, con IAM, TLS y lectores.','RDS, Aurora PostgreSQL/MySQL or DocumentDB, with IAM, TLS and readers.'],
 ['identity','identity','Identidad','Identity','Cognito, PKCE, rol Operators y claves públicas por invocación privada.','Cognito, PKCE, Operators and public keys through private invocation.'],
 ['events','events','Eventos opcionales','Optional events','Activa SQS, DLQ, Lambda privada y recuperación del outbox cuando lo necesites.','Opt in to SQS, DLQ, VPC-connected Lambda and outbox recovery when needed.'],
 ['registry','layers','Imágenes','Images','ECR compartido, tags inmutables y despliegue por digest.','Shared ECR, immutable tags and digest-based deployment.'],
 ['waf','shield','Protección web','Web protection','Reglas gestionadas y limitación por IP, compartidas por las entradas.','Managed rules and IP rate limits shared across public entries.'],
 ['state','lock','Estado de Terraform','Terraform state','S3 cifrado, versionado y bloqueo nativo mediante lockfile.','Encrypted, versioned S3 and native lockfile-based state locking.'],
 ['observability','wallet','Presupuesto','Budget','Presupuesto mensual de instalación y avisos opcionales por email.','Installation monthly budget and optional email alerts.'],
];
function renderModules(){
 const grid=$('module-grid');grid.replaceChildren();
 for(const [name,icon,esTitle,enTitle,esText,enText]of modules){const card=document.createElement('article');card.className='module-card';const graphic=document.createElement('span');graphic.className='module-icon';graphic.innerHTML=`<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${icon}"></use></svg>`;const info=document.createElement('div'),title=document.createElement('h3'),description=document.createElement('p'),link=document.createElement('a');title.textContent=state.locale==='es'?esTitle:enTitle;description.textContent=state.locale==='es'?esText:enText;link.textContent='modules/'+name+' ↗';link.href='docs/modules/'+name+'.html';info.append(title,description,link);card.append(graphic,info);grid.append(card);}
}
function renderStars(){
 if(!state.snapshot)return;
 for(const badge of document.querySelectorAll('[data-github-stars]')){badge.hidden=false;badge.querySelector('[data-github-count]').textContent=formatStarCount(state.snapshot.count,state.locale);const checked=new Intl.DateTimeFormat(state.locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.snapshot.checkedAt));badge.title=(state.locale==='es'?'Comprobado: ':'Checked: ')+checked;badge.closest('a').setAttribute('aria-label',`GitHub · ${state.snapshot.count} ${state.locale==='es'?'estrellas':'stars'}`);}
}
const diagram=createDiagram({container:$('architecture-map'),locale:state.locale,onSelect:node=>{$('node-kind').textContent=node.env?node.env.toUpperCase():(state.locale==='es'?'Compartido':'Shared');$('node-title').textContent=node.title;$('node-description').textContent=node.description;$('node-access').textContent=node.access;$('node-module').textContent='modules/'+node.module;$('node-source').href='docs/modules/'+node.module+'.html';}});
const heroArchitecture=createHeroArchitecture({locale:state.locale,onExplore:selected=>{
 for(const button of document.querySelectorAll('[data-diagram]'))button.setAttribute('aria-pressed',String(button.dataset.diagram==='overview'));
 const environment=/^(dev|prod)-/.exec(selected)?.[1]||'all';
 for(const button of document.querySelectorAll('[data-environment]'))button.setAttribute('aria-pressed',String(button.dataset.environment===environment));
 diagram.update({selected,view:'overview',environment});
 $('open-diagram').href='diagrams/overview.html?lang='+state.locale;
 const scroll=document.querySelector('.diagram-scroll');scroll.scrollLeft=environment==='prod'?scroll.scrollWidth-scroll.clientWidth:0;
}});
const databaseExplorer=createDatabaseExplorer();
function applyLanguage(locale){
 if(!['es','en'].includes(locale)||!state.dictionaries[locale])return;state.locale=locale;document.documentElement.lang=locale;
 for(const element of document.querySelectorAll('[data-i18n]')){const text=state.dictionaries[locale][element.dataset.i18n];if(text)element.textContent=text;}
 for(const button of document.querySelectorAll('[data-lang]'))button.setAttribute('aria-pressed',String(button.dataset.lang===locale));
 document.querySelector('.languages').setAttribute('aria-label',locale==='es'?'Idioma':'Language');
 document.querySelector('.main-nav').setAttribute('aria-label',locale==='es'?'Navegación':'Navigation');
 $('copy-config').setAttribute('aria-label',state.dictionaries[locale]['start.copy']);
 $('copy-config').setAttribute('title',state.dictionaries[locale]['start.copy']);
 document.querySelector('.config-tabs').setAttribute('aria-label',locale==='es'?'Configuración':'Configuration');
 for(const link of document.querySelectorAll('a[href^="docs/"]')){if(!link.pathname.includes('/modules/')){const url=new URL(link.href);if(locale==='en')url.searchParams.set('lang','en');else url.searchParams.delete('lang');link.href=url.pathname.split('/').slice(-2).join('/')+url.search;}}
 renderModules();renderStars();databaseExplorer.update(locale);diagram.update({locale});heroArchitecture.update(locale);lab?.update();
 $('open-diagram').href=`diagrams/${document.querySelector('[data-diagram][aria-pressed="true"]').dataset.diagram}.html?lang=${locale}`;
 try{localStorage.setItem('forge:language',locale);}catch{}
}
for(const button of document.querySelectorAll('[data-lang]'))button.addEventListener('click',()=>applyLanguage(button.dataset.lang));
for(const button of document.querySelectorAll('[data-diagram]'))button.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-diagram]'))other.setAttribute('aria-pressed',String(other===button));diagram.update({view:button.dataset.diagram});$('open-diagram').href=`diagrams/${button.dataset.diagram}.html?lang=${state.locale}`;});
for(const button of document.querySelectorAll('[data-environment]'))button.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-environment]'))other.setAttribute('aria-pressed',String(other===button));diagram.update({environment:button.dataset.environment});const scroll=document.querySelector('.diagram-scroll');scroll.scrollLeft=button.dataset.environment==='prod'?scroll.scrollWidth-scroll.clientWidth:0;});
let configRequest=null,loadedConfig='dev';
const configCache=new Map([['dev',$('config-code').textContent]]);
for(const button of document.querySelectorAll('[data-config]'))button.addEventListener('click',async()=>{
 const name=button.dataset.config;configRequest?.abort();const request=new AbortController();configRequest=request;$('copy-config').disabled=true;
 for(const other of document.querySelectorAll('[data-config]'))other.setAttribute('aria-pressed',String(other===button));
 try{
  let content=configCache.get(name);
  if(!content){
   $('config-status').textContent=state.locale==='es'?'Cargando ejemplo…':'Loading example…';
   const folder=location.pathname.includes('/site/')?(name==='demo'?'../examples/demo/':'../environments/'):'./content/';
   const response=await fetch(new URL(folder+name+'.auto.tfvars.example',import.meta.url),{signal:AbortSignal.any([request.signal,AbortSignal.timeout(5000)])});
   if(!response.ok)throw Error('configuration_unavailable');content=await response.text();configCache.set(name,content);
  }
  if(request.signal.aborted)return;
  $('config-code').textContent=content;$('config-caption').textContent=(name==='demo'?'examples/demo/':'environments/')+name+'.auto.tfvars.example';loadedConfig=name;$('config-status').textContent='';
 }catch{
  if(request.signal.aborted)return;
  for(const other of document.querySelectorAll('[data-config]'))other.setAttribute('aria-pressed',String(other.dataset.config===loadedConfig));
  $('config-status').textContent=state.locale==='es'?'No se pudo cargar el ejemplo. Se conserva el anterior.':'Could not load the example. The previous example is retained.';
 }finally{if(!request.signal.aborted)$('copy-config').disabled=false;}
});
$('copy-config').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('config-code').textContent);$('config-status').textContent=state.locale==='es'?'Configuración copiada.':'Configuration copied.';}
 catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents($('config-code'));selection.removeAllRanges();selection.addRange(range);$('config-status').textContent=state.locale==='es'?'Bloque seleccionado. Usa copiar en tu navegador.':'Block selected. Use your browser copy command.';}
});

if(state.product.version)for(const element of document.querySelectorAll('[data-version]'))element.textContent='v'+state.product.version;
const repository=state.product.repository;
const validRepository=typeof repository==='string'&&/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(repository);
if(validRepository)for(const link of document.querySelectorAll('[data-repository]')){link.href=repository;link.hidden=false;}
let metadataStorage=null;try{metadataStorage=sessionStorage;}catch{}
async function loadStars(){try{const snapshot=await getStarSnapshot(repository,{storage:metadataStorage,refresh:true,fallback:initialSnapshot});if(snapshot&&(!state.snapshot||Date.parse(snapshot.checkedAt)>=Date.parse(state.snapshot.checkedAt))){state.snapshot=snapshot;renderStars();}}finally{state.starFlight=null;}}
function refreshStars(){if(!validRepository||document.visibilityState==='hidden')return;if(!state.starFlight)state.starFlight=loadStars();return state.starFlight;}
window.addEventListener('focus',refreshStars);window.addEventListener('pageshow',refreshStars);document.addEventListener('visibilitychange',refreshStars);setInterval(refreshStars,60000);refreshStars();
import('./lab.js').then(({createLab})=>{lab=createLab({locale:()=>state.locale});}).catch(()=>{$('lab-status').textContent=state.locale==='es'?'No se pudo cargar el laboratorio. La arquitectura y las guías siguen disponibles.':'The lab could not load. Architecture and guides are still available.';});
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelector('[data-flow-step="0"]')?.classList.add('active');setInterval(()=>{if(document.visibilityState==='hidden')return;const steps=document.querySelector('[data-lab-mode="events"][aria-pressed="true"]')?4:3;state.flow=(state.flow+1)%(steps+2);for(const [index,item]of [...document.querySelectorAll('[data-flow-step]')].entries())item.classList.toggle('active',index===state.flow&&state.flow<steps);},1500);}
applyLanguage(state.locale);
document.querySelector('[data-config="dev"]')?.click();
