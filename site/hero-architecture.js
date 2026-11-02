/** Logical AWS explorer. Animation illustrates the architecture; it never calls AWS. */
const copy={
 es:{
  registry:['ECR compartido','Las imágenes se publican una vez. Dev y Prod despliegan su propio digest inmutable.'],
  waf:['Protección web compartida','Una Web ACL protege las entradas CloudFront de ambos entornos. Las APIs reciben las peticiones a través de un ALB interno.'],
  state:['Estado y presupuesto','Estados separados en S3 cifrado y un presupuesto de instalación. Compartir la base evita duplicar estos servicios.'],
  edge:['Entrada HTTPS por entorno','CloudFront sirve la web desde S3 privado y dirige /api/* al ALB mediante VPC origins.'],
  api:['Cómputo privado','El ALB interno recibe las peticiones de CloudFront. La API Node.js se ejecuta en Fargate sin IP pública y valida la identidad.'],
  db:['Datos detrás de la API','Elige PostgreSQL, Aurora o DocumentDB. La aplicación usa IAM y TLS; la base solo admite el puerto privado desde los grupos autorizados.'],
  worker:['Eventos opcionales','Si habilitas SQS, la API guarda solicitud y outbox juntos. Publica por PrivateLink y una Lambda en la VPC procesa el evento sin duplicar actividad.'],
  cognito:['Identidad por entorno','Cada entorno tiene su pool Cognito. La API valida el token y los permisos. El login gestionado de AWS tiene su propia entrada pública.'],
  shared:'Compartido',env:'Entorno',link:'Explorar esta pieza',label:'Explorador de arquitectura AWS',view:'Vista de arquitectura',trace:'Recorrido ilustrativo',
 },
 en:{
  registry:['Shared ECR','Publish images once. Dev and Prod each deploy their own immutable digest.'],
  waf:['Shared web protection','One Web ACL protects both environment CloudFront entry points. API requests reach an internal ALB.'],
  state:['State and budget','Separate states in encrypted S3 and an installation budget. Sharing the foundation avoids duplicating these services.'],
  edge:['HTTPS entry per environment','CloudFront serves the website from private S3 and forwards /api/* to the ALB through VPC origins.'],
  api:['Private compute','The internal ALB receives CloudFront requests. The Node.js API runs in Fargate without a public IP and validates identity.'],
  db:['Data behind the API','Choose PostgreSQL, Aurora or DocumentDB. The application uses IAM and TLS; the database accepts only its private port from authorized groups.'],
  worker:['Optional events','When SQS is enabled, the API commits request and outbox together. It publishes through PrivateLink and a VPC-connected Lambda processes the event without duplicate activity.'],
  cognito:['Identity per environment','Each environment owns a Cognito pool. The API validates tokens and permissions. AWS managed login has its own public entry.'],
  shared:'Shared',env:'Environment',link:'Explore this component',label:'AWS architecture explorer',view:'Architecture view',trace:'Illustrative flow',
 },
};
const views={
 shared:{
  es:{scope:'01 / COMPARTIR LA BASE',title:'Se crea una vez. Lo consumen dos entornos.',description:'ECR, WAF, estado y presupuesto son comunes. Cada entorno conserva su red, aplicaciones, identidad y datos.',trace:['Plataforma','Dev + Prod']},
  en:{scope:'01 / SHARE THE FOUNDATION',title:'Created once. Used by two environments.',description:'ECR, WAF, state and budget are shared. Each environment owns its network, applications, identity and data.',trace:['Foundation','Dev + Prod']},
 },
 entry:{
  es:{scope:'02 / ENTRADA WEB',title:'Una entrada pública. Cargas privadas.',description:'CloudFront y WAF protegen las webs y las APIs. La petición entra por un ALB interno y la API aplica identidad y permisos antes de consultar los datos.',trace:['HTTPS','CloudFront + WAF','ALB','API','Datos']},
  en:{scope:'02 / WEB ENTRY',title:'Public entry. Private workloads.',description:'CloudFront and WAF protect web and API entry. Requests reach an internal ALB; the API validates identity and permissions before reading data.',trace:['HTTPS','CloudFront + WAF','ALB','API','Data']},
 },
 events:{
  es:{scope:'03 / EXTENSIÓN OPCIONAL',title:'Activa SQS cuando necesites trabajo asíncrono.',description:'La solicitud y su outbox se guardan juntos. SQS es regional; la app publica por PrivateLink y el worker Lambda accede a los datos desde la VPC. Está desactivado por defecto.',trace:['API + outbox','SQS','Lambda','Datos']},
  en:{scope:'03 / OPTIONAL EXTENSION',title:'Enable SQS when you need asynchronous work.',description:'Request and outbox are committed together. SQS is regional; the app publishes through PrivateLink and the Lambda worker accesses data from the VPC. Disabled by default.',trace:['API + outbox','SQS','Lambda','Data']},
 },
};
export function createHeroArchitecture({locale='es',onExplore=()=>{}}={}){
 const root=document.getElementById('hero-architecture'),state={locale,view:'shared',selected:null};
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,runTimer,pauseTimer;
 function stop(){clearTimeout(runTimer);clearTimeout(pauseTimer);root.classList.remove('is-tracing');}
 function animate(){
  stop();if(!visible||document.hidden||motion.matches)return;
  void root.offsetWidth;root.classList.add('is-tracing');
  runTimer=setTimeout(()=>{root.classList.remove('is-tracing');pauseTimer=setTimeout(animate,2500);},3000);
 }
 function render(){
  const t=copy[state.locale],view=views[state.view][state.locale],key=state.selected?.replace(/^(dev|prod)-/,''),environment=/^(dev|prod)-/.exec(state.selected||'')?.[1],detail=key?t[key]:null;
  root.dataset.view=state.view;root.dataset.focus=key||state.view;root.setAttribute('aria-label',t.label);
  root.querySelector('.hero-views').setAttribute('aria-label',t.view);
  for(const button of root.querySelectorAll('[data-hero-view]'))button.setAttribute('aria-pressed',String(button.dataset.heroView===state.view));
  for(const button of root.querySelectorAll('[data-hero-node]'))button.setAttribute('aria-pressed',String(button.dataset.heroNode===state.selected));
  for(const panel of root.querySelectorAll('[data-hero-environment]')){panel.classList.toggle('is-focused',!environment||panel.dataset.heroEnvironment===environment);panel.setAttribute('role','group');panel.setAttribute('aria-label',panel.dataset.heroEnvironment.toUpperCase()+' · '+t.env);}
  document.getElementById('hero-detail-scope').textContent=detail?(environment?environment.toUpperCase()+' · '+t.env:t.shared):view.scope;
  document.getElementById('hero-detail-title').textContent=detail?detail[0]:view.title;
  document.getElementById('hero-detail-copy').textContent=detail?detail[1]:view.description;
  document.getElementById('hero-detail-link').setAttribute('aria-label',t.link+': '+(detail?detail[0]:view.title));
  const trace=document.getElementById('hero-trace');trace.setAttribute('aria-label',t.trace);
  trace.replaceChildren(...view.trace.flatMap((label,index)=>{const chip=document.createElement('span');chip.textContent=label;chip.style.setProperty('--step',index);if(!index)return [chip];const arrow=document.createElement('i');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');return [arrow,chip];}));
 }
 root.addEventListener('click',event=>{
  const view=event.target.closest('[data-hero-view]');
  if(view){state.view=view.dataset.heroView;state.selected=null;render();animate();return;}
  const node=event.target.closest('[data-hero-node]');
  if(node){state.selected=node.dataset.heroNode;const key=state.selected.replace(/^(dev|prod)-/,'');state.view=key==='worker'?'events':['registry','state'].includes(key)?'shared':'entry';render();animate();}
 });
 document.getElementById('hero-detail-link').addEventListener('click',()=>onExplore(state.selected||({shared:'waf',entry:'dev-edge',events:'dev-worker'})[state.view]));
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const next=entry.isIntersecting&&entry.intersectionRatio>=.15;if(next!==visible){visible=next;animate();}}},{threshold:[0,.15]});
 observer.observe(root);motion.addEventListener('change',animate);document.addEventListener('visibilitychange',animate);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',animate);
 render();return {update(locale){state.locale=locale;render();animate();}};
}
