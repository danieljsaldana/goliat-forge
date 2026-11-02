import {databasePreview} from './database-profile.mjs';
const profiles=[
 {kind:'postgres',name:'RDS PostgreSQL',subtitle:['SQL · instancia gestionada','SQL · managed instance'],class:'db.t4g.small',copy:['El punto de partida. PostgreSQL con tokens IAM y TLS. Multi-AZ añade un standby. Para lectores con secreto gestionado, elige Aurora PostgreSQL.','The starting point. PostgreSQL with IAM tokens and TLS. Multi-AZ adds a standby. Choose Aurora PostgreSQL for readers with a managed master secret.'],auth:['Usuario SQL + rds_iam · rol por proceso','SQL user + rds_iam · role per process'],port:'5432'},
 {kind:'aurora-postgresql',name:'Aurora PostgreSQL',subtitle:['SQL · clúster','SQL · cluster'],class:'db.r6g.large',copy:['Mantén el contrato PostgreSQL y elige un clúster Aurora. Configura lectores, tamaño y prioridad de promoción para el failover.','Keep the PostgreSQL contract and choose an Aurora cluster. Configure reader sizes and promotion priority for failover.'],auth:['Tokens IAM · escritor y endpoint de lectura','IAM tokens · writer and reader endpoint'],port:'5432'},
 {kind:'aurora-mysql',name:'Aurora MySQL',subtitle:['SQL · compatible con MySQL','SQL · MySQL compatible'],class:'db.r6g.large',copy:['La misma aplicación con adaptador MySQL. Autenticación IAM por conexión, TLS obligatorio y permisos SQL separados para API y worker.','The same application with a MySQL adapter. IAM authentication per connection, required TLS and separate API/worker SQL permissions.'],auth:['AWSAuthenticationPlugin · sin contraseña en la app','AWSAuthenticationPlugin · no app password'],port:'3306'},
 {kind:'documentdb',name:'Amazon DocumentDB',subtitle:['Documentos · API MongoDB','Documents · MongoDB API'],class:'db.r6g.large',copy:['La opción documental de AWS. El perfil 5.0 usa MONGODB-AWS y roles por colección. Compatible con parte de MongoDB; revisa las diferencias antes de migrar.','The AWS document option. The 5.0 profile uses MONGODB-AWS and collection roles. It supports part of the MongoDB API; review differences before migrating.'],auth:['ARN del rol en $external · TLS · réplicas','Role ARN in $external · TLS · replicas'],port:'27017'},
];
export function createDatabaseExplorer(){
 const state={locale:'es',kind:'postgres',highAvailability:false,readerCount:0},grid=document.getElementById('database-options');
 function select(kind){state.kind=kind;details();for(const button of grid.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.database===kind));}
 function details(){
  const index=state.locale==='es'?0:1,p=profiles.find(profile=>profile.kind===state.kind);
  document.getElementById('database-name').textContent=p.name;
  document.getElementById('database-copy').textContent=p.copy[index];
  document.getElementById('database-auth').textContent=p.auth[index];
  document.getElementById('database-port').textContent=(index===0?'Puerto privado ':'Private port ')+p.port;
  document.getElementById('database-example').href='source/examples/databases/'+p.kind+'.tfvars.html';
  const preview=databasePreview(state.kind,state);
  const select=document.getElementById('database-readers');select.disabled=p.kind==='postgres';select.value=String(preview.readers);document.getElementById('database-ha').checked=preview.highAvailability;
  document.getElementById('database-code').textContent=preview.snippet;
  const topology=document.getElementById('database-topology'),api=document.createElement('span'),arrow=document.createElement('span'),writer=document.createElement('span');
  api.className='data-api';api.textContent='API';arrow.className='data-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');writer.className='data-writer';writer.textContent=index===0?'Escritor':'Writer';topology.replaceChildren(api,arrow,writer);
  if(preview.standby||preview.readers){const branch=document.createElement('span');branch.className='data-readers';branch.textContent=preview.standby?'Standby':preview.readers+' '+(index===0?'lectores':'readers');topology.append(branch);}
  const explanation=p.kind==='postgres'?(preview.standby?(index===0?'1 escritor + 1 standby en otra AZ. El standby no sirve lecturas.':'1 writer + 1 standby in another AZ. The standby does not serve reads.'):(index===0?'1 instancia. Para lectores con secreto gestionado, elige Aurora PostgreSQL.':'1 instance. For readers with a managed secret, choose Aurora PostgreSQL.')):(index===0?`1 escritor + ${preview.readers} lectores. ${preview.highAvailability?'Al menos uno se sitúa en otra AZ.':'Sin requisito de cómputo Multi-AZ.'}`:`1 writer + ${preview.readers} readers. ${preview.highAvailability?'At least one is placed in another AZ.':'No Multi-AZ compute requirement.'}`);
  document.getElementById('database-capacity-note').textContent=explanation+' '+(index===0?'La app de ejemplo consulta siempre el escritor.':'The reference app always reads from the writer.');topology.setAttribute('aria-label',explanation);

 }
 function update(locale){
  state.locale=locale;grid.replaceChildren();const index=locale==='es'?0:1;
  for(const profile of profiles){
   const button=document.createElement('button'),name=document.createElement('strong'),subtitle=document.createElement('span');
   button.type='button';button.dataset.database=profile.kind;button.setAttribute('aria-pressed',String(profile.kind===state.kind));name.textContent=profile.name;subtitle.textContent=profile.subtitle[index];button.append(name,subtitle);button.addEventListener('click',()=>select(profile.kind));grid.append(button);
  }
  details();
 }
 document.getElementById('database-ha').addEventListener('change',event=>{state.highAvailability=event.target.checked;details();});
 document.getElementById('database-readers').addEventListener('change',event=>{state.readerCount=Number(event.target.value);if(state.readerCount===0)state.highAvailability=false;details();});
 update('es');return {update};
}
