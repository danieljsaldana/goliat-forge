import {createMemoryRepository,validateRequest,publishPending,processEvent,eventFor} from '../apps/shared/domain.mjs';

const messages={
 ready:['Envía una solicitud. Después cambia de usuario para explorar qué puede consultar cada uno.','Submit a request. Then switch users to explore which records each one can read.'],
 saved:['Solicitud guardada y visible para su propietario. Este modo no crea cola, worker ni outbox.','Request saved and visible to its owner. This mode creates no queue, worker or outbox.'],
 pending:['Guardada. La cola está caída; el outbox conserva el evento. Activa la cola y recupera los pendientes.','Saved. The queue is offline; the outbox retains the event. Enable the queue and recover pending events.'],
 processed:['Procesada. Repite el evento: comprobarás que sigue existiendo una sola actividad.','Processed. Replay the event: there will still be only one business activity.'],
 recovered:['Recuperación completada. Se ha usado la solicitud original, sin duplicarla.','Recovery completed using the original request, without duplicating it.'],
 stillPending:['La cola sigue caída. Actívala antes de volver a recuperar.','The queue is still offline. Enable it before recovering again.'],
 duplicate:['Mismo identificador. La actividad ya existía y no se ha repetido.','Same identifier. The activity already existed and was not repeated.'],
 nothing:['No hay eventos pendientes de entregar.','There are no pending events to deliver.'],
 invalid:['Escribe un título de entre 1 y 140 caracteres.','Enter a title between 1 and 140 characters.'],
 commit:['API → datos: solicitud guardada.','API → data: request committed.'],
 outbox:['Datos: solicitud y outbox guardados juntos.','Data: request and outbox committed together.'],
 delivered:['Outbox → SQS: evento entregado.','Outbox → SQS: event delivered.'],
 worker:['Worker → datos: actividad confirmada.','Worker → data: activity confirmed.'],
 replay:['Worker: identificador ya procesado; duplicado descartado.','Worker: identifier already processed; duplicate ignored.'],
 empty:['Todavía no hay solicitudes para esta vista.','There are no requests in this view yet.'],
 owner:['Usuario A','User A'], other:['Usuario B','User B'], operator:['Operador','Operator'],
 accepted:['Guardada','Saved'], done:['Procesada','Processed'], waiting:['Evento pendiente','Event pending'],
 sample:['Preparar el entorno del nuevo equipo','Prepare the new team environment'],
};

export function createLab({locale=()=> 'es'}={}){
 const $=id=>document.getElementById(id),state={mode:'basic',person:'self',last:null,status:'ready',logs:[],busy:false};
 let repository=createMemoryRepository({eventsEnabled:false});
 const text=key=>messages[key][locale()==='es'?0:1];
 const events=()=>state.mode==='events';
 const principal=()=>({sub:state.person==='other'?'browser-user-b':'browser-user-a',operator:state.person==='operator'});
 function log(key){state.logs.unshift(key);state.logs.length=Math.min(state.logs.length,5);}
 function status(key){state.status=key;}
 async function render(){
  const [requests,activities,pending]=await Promise.all([repository.list(principal()),repository.activities(principal()),repository.pending()]);
  const pendingIds=new Set(pending.map(item=>item.id));
  for(const button of document.querySelectorAll('[data-lab-mode]')){button.setAttribute('aria-pressed',String(button.dataset.labMode===state.mode));button.disabled=state.busy;}
  for(const button of document.querySelectorAll('[data-lab-person]')){button.setAttribute('aria-pressed',String(button.dataset.labPerson===state.person));button.disabled=state.busy;}
  $('queue-online').disabled=!events()||state.busy;
  $('lab-event-controls').hidden=!events();$('lab-event-metrics').hidden=!events();
  $('lab-owner-form').hidden=state.person==='operator';
  $('lab-active-user').textContent=text(state.person==='self'?'owner':state.person==='other'?'other':'operator');
  $('lab-view-label').textContent=state.person==='operator'?(locale()==='es'?'Solicitudes del equipo':'Team requests'):(locale()==='es'?'Mis solicitudes':'My requests');
  $('lab-request-count').textContent=requests.length;$('lab-activity-count').textContent=activities.length;$('lab-pending-count').textContent=pending.filter(item=>requests.some(request=>request.id===item.id)).length;
  $('lab-status').textContent=text(state.status);$('lab-status').dataset.tone=['pending','stillPending','invalid'].includes(state.status)?'pending':'ok';
  $('lab-events').replaceChildren(...state.logs.map(key=>{const li=document.createElement('li');li.textContent=text(key);return li;}));
  $('lab-events').hidden=state.logs.length===0;
  $('lab-replay').disabled=!state.last||pendingIds.has(state.last.id)||state.busy;$('lab-recover').disabled=state.busy;
  $('lab-reset').disabled=state.busy;
  const list=$('lab-requests');list.replaceChildren();
  if(!requests.length){const p=document.createElement('p');p.className='demo-empty';p.textContent=text('empty');list.append(p);}
  for(const item of requests.slice(0,3)){
   const row=document.createElement('div');row.className='demo-request';
   const icon=document.createElement('span');icon.className='request-glyph';icon.textContent='↗';icon.setAttribute('aria-hidden','true');
   const copy=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');title.textContent=item.title;detail.textContent=text(item.owner_id==='browser-user-a'?'owner':'other')+' · '+item.id.slice(0,8);copy.append(title,detail);
   const badge=document.createElement('span');badge.className='request-status';badge.dataset.state=item.status==='processed'?'done':pendingIds.has(item.id)?'pending':'saved';badge.textContent=text(item.status==='processed'?'done':pendingIds.has(item.id)?'waiting':'accepted');row.append(icon,copy,badge);list.append(row);
  }
  $('lab-pipeline').dataset.mode=state.mode;
  if(messages.sample.includes($('lab-title').value)||$('lab-title').value==='Preparar el entorno de un equipo')$('lab-title').value=text('sample');
  document.querySelector('.demo-mode').setAttribute('aria-label',locale()==='es'?'Modo del ejemplo':'Example mode');
  document.querySelector('.demo-person').setAttribute('aria-label',locale()==='es'?'Usuario simulado':'Simulated user');
  $('lab-pipeline').setAttribute('aria-label',locale()==='es'?'Flujo del ejemplo':'Example flow');
  for(const stage of document.querySelectorAll('[data-demo-stage]')){
   const name=stage.dataset.demoStage;stage.dataset.state=name==='worker'&&!events()?'off':name==='worker'&&pending.length?'pending':state.logs.length?'done':'ready';
  }
  const optionalStep=document.querySelector('[data-flow-step="3"]');optionalStep?.classList.toggle('optional-inactive',!events());if(!events())optionalStep?.classList.remove('active');
 }
 async function sender(event){
  if(!$('queue-online').checked)throw Error('offline');
  log('delivered');await processEvent(repository,event);log('worker');
 }
 async function submit(){
  const input=validateRequest({id:crypto.randomUUID(),title:$('lab-title').value,detail:'Fictional browser example'});
  await repository.create(principal(),input);log(events()?'outbox':'commit');
  if(events()){state.last=eventFor(input);const delivered=await publishPending(repository,sender,input.id);status(delivered.some(item=>!item.published)?'pending':'processed');}
  else status('saved');
 }
 async function action(work){
  if(state.busy)return;state.busy=true;
  try{await work();}catch{status('invalid');}finally{state.busy=false;await render();}
 }
 async function reset(mode=state.mode){state.mode=mode;state.person='self';state.last=null;state.logs=[];state.status='ready';repository=createMemoryRepository({eventsEnabled:events()});$('queue-online').checked=true;await render();}
 $('lab-form').addEventListener('submit',event=>{event.preventDefault();action(submit);});
 for(const button of document.querySelectorAll('[data-lab-mode]'))button.addEventListener('click',()=>{if(button.dataset.labMode!==state.mode)action(()=>reset(button.dataset.labMode));});
 for(const button of document.querySelectorAll('[data-lab-person]'))button.addEventListener('click',()=>action(async()=>{state.person=button.dataset.labPerson;}));
 $('lab-recover').addEventListener('click',()=>action(async()=>{const pending=await repository.pending();const result=await publishPending(repository,sender);status(!pending.length?'nothing':result.some(item=>!item.published)?'stillPending':'recovered');}));
 $('lab-replay').addEventListener('click',()=>action(async()=>{if(!state.last)return;const created=await processEvent(repository,state.last);log(created?'worker':'replay');status(created?'processed':'duplicate');}));
 $('lab-failure').addEventListener('click',async()=>{await action(async()=>{await reset('events');$('queue-online').checked=false;$('lab-title').value=text('sample');await submit();});$('lab-status').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
 $('lab-reset').addEventListener('click',()=>action(()=>reset()));
 render();return {update:render};
}
