const texts = {
 es: {
  shared:'PLATAFORMA COMPARTIDA',private:'VPC PRIVADA',managed:'SERVICIOS GESTIONADOS DE AWS',
  registry:['ECR','Imágenes inmutables','Registro compartido para las imágenes de la aplicación. Cada entorno despliega un digest concreto.','Pull por IAM; sin credenciales de registro en la aplicación.','registry'],
  waf:['AWS WAF','Reglas compartidas','Una Web ACL global protege ambas distribuciones CloudFront. Incluye reglas gestionadas y limitación por IP.','Entrada HTTP pública de las webs y las APIs; no inspecciona SQL ni eventos.','waf'],
  state:['Estado + presupuesto','S3/KMS · AWS Budgets','El backend cifra y versiona los estados; un presupuesto filtra el consumo de la instalación por etiqueta.','Estado privado y bloqueado. Las alertas requieren activar la etiqueta de coste.','state'],
  edge:['CloudFront','HTTPS · acceso público','Sirve los portales desde S3 privado y envía /api/* al ALB mediante VPC origins. Cada entorno tiene su distribución.','WAF compartido. El certificado generado sirve para Dev/demo; Prod usa dominio y ACM.','edge'],
  cognito:['Cognito','OAuth · PKCE + MFA','Pool y cliente por entorno. El navegador usa el login gestionado; la API valida emisor, firma, vencimiento y client ID.','Login público de AWS fuera del WAF de la app. Las contraseñas no llegan al frontend ni a la API.','identity'],
  web:['Frontend en S3','Privado · OAC','Export estático Next.js de Luma y configuración pública de Cognito. El mapa de portales ofrece vistas de usuario y operador.','S3 bloquea acceso público; solo CloudFront puede leer mediante OAC.','edge'],
  alb:['ALB interno','Solo desde CloudFront','Balanceador privado con comprobaciones de salud. No tiene una entrada directa pública que evite el WAF.','Security group limitado al prefijo de origen de CloudFront. El salto interno usa HTTP.','edge'],
  api:['ECS Fargate','Node.js · rol IAM','La API verifica JWT de Cognito y filtra consultas por propietario. Un rol Operators puede consultar el conjunto.','Sin IP pública. Solo recibe al ALB; usa su rol para el motor de datos elegido y las APIs AWS necesarias.','service'],
  db:['Datos privados','RDS · Aurora · DocumentDB','Conserva solicitudes, outbox y actividad. Motor seleccionable, usuarios/roles separados y lectores opcionales.','Sin acceso público. Solo el puerto del motor desde SG de API/worker; TLS con validación de certificado.','database'],
  queue:['Endpoint SQS','Opcional · cola + DLQ','La API publica por PrivateLink. SQS es un servicio regional de AWS, no una máquina dentro de tu VPC.','IAM limita el acceso a la cola. La integración de Lambda consume mensajes y admite reintentos.','events'],
  worker:['Worker Lambda','Opcional · en VPC','Procesa eventos una vez a nivel de negocio, aunque la cola los entregue varias veces. Un timer recupera el outbox pendiente.','Sin Function URL. Accede al motor seleccionado con su propio rol.','events'],
  keys:['Claves de Cognito','Lambda auxiliar · IAM','Obtiene únicamente las claves públicas del pool configurado. Permite validar JWT y rotaciones sin dar Internet a Fargate.','Sin URL pública ni acceso a los datos. Fuera de la VPC; la API la invoca por endpoint privado.','identity'],
 },
 en: {
  shared:'SHARED FOUNDATION',private:'PRIVATE VPC',managed:'AWS MANAGED SERVICES',
  registry:['ECR','Immutable images','A shared registry for application images. Each environment deploys a specific immutable digest.','IAM-scoped pulls; no registry credentials in the application.','registry'],
  waf:['AWS WAF','Shared rules','One global Web ACL protects both CloudFront distributions with managed rules and IP rate limits.','Public HTTP entry for the websites and APIs; it does not inspect SQL or events.','waf'],
  state:['State + budget','S3/KMS · AWS Budgets','Encrypted, versioned Terraform state and a budget filtering installation spend by its cost tag.','Private, locked state. Alerts require activating the cost allocation tag.','state'],
  edge:['CloudFront','HTTPS · public entry','Serves portals from private S3 and forwards /api/* to the internal ALB through VPC origins. Each environment owns a distribution.','Shared WAF. The generated certificate is for Dev/demo; Prod uses a domain and ACM.','edge'],
  cognito:['Cognito','OAuth · PKCE + MFA','A pool and client per environment. The browser uses managed login; the API validates issuer, signature, expiry and client ID.','AWS public login is outside the application WAF. Passwords never reach the frontend or API.','identity'],
  web:['S3 frontend','Private · OAC','Luma Next.js static export and public Cognito configuration. A portal map supplies requester and operator views.','S3 public access is blocked; only the CloudFront distribution can read through OAC.','edge'],
  alb:['Internal ALB','CloudFront origins only','A private load balancer with health checks. There is no direct public API entry bypassing the WAF.','Security group allows CloudFront origin-facing traffic. The internal hop uses HTTP.','edge'],
  api:['ECS Fargate','Node.js · IAM role','The API verifies Cognito JWTs and scopes queries to the owner. Operators can inspect all reference requests.','No public IP. Inbound from ALB only; its role for the chosen database and required AWS APIs.','service'],
  db:['Private database','RDS · Aurora · DocumentDB','Stores requests, outbox and activity. Selectable engine, separate users/roles and optional readers.','Not public. Selected engine port only from API/worker SGs; TLS validates the database certificate.','database'],
  queue:['SQS endpoint','Optional · queue + DLQ','The API publishes through PrivateLink. SQS is an AWS regional service, not a machine inside your VPC.','IAM restricts access to this queue. Lambda integration polls messages and supports retries.','events'],
  worker:['Lambda worker','Optional · in VPC','Processes each business event once despite duplicate queue deliveries. A timer recovers pending outbox rows.','No Function URL. Its own IAM role connects to the selected database.','events'],
  keys:['Cognito keys','Helper Lambda · IAM','Fetches only the configured pool public keys. JWT verification and rotation work without Internet access for Fargate.','No public URL or data access. Outside the VPC; the API invokes it over a private endpoint.','identity'],
 }
};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function diagramNodes(state){
  const result=[{id:'registry',key:'registry',x:55,y:28,w:190,h:56,kind:'shared'},{id:'waf',key:'waf',x:435,y:28,w:250,h:56,kind:'shared'},{id:'state',key:'state',x:875,y:28,w:190,h:56,kind:'shared'}];
  for(const [env,offset] of [['dev',0],['prod',560]]){
   result.push(...[
    {key:'edge',x:155,y:135,w:250,h:60,kind:'edge'},
    {key:state.view==='network'?'keys':'web',x:75,y:210,w:190,h:48,kind:'edge'},
    {key:'cognito',x:300,y:210,w:190,h:48,kind:'edge'},
    {key:'alb',x:300,y:300,w:190,h:55,kind:'private'},
    {key:'api',x:300,y:395,w:190,h:60,kind:'private'},
    {key:'db',x:75,y:505,w:205,h:60,kind:'private'},
    {key:'queue',x:300,y:505,w:190,h:55,kind:'private'},
    {key:'worker',x:300,y:600,w:190,h:55,kind:'private'},

   ].map(node=>({...node,id:env+'-'+node.key,env,x:node.x+offset})));
  }
  return result;
 }
export function renderDiagramSvg({locale='es',view='overview',environment='all',selected='waf'}={}) {
 const state={locale,view,environment,selected};
  const t=texts[state.locale],all=diagramNodes(state);
  const paths=['M560 84 V110 H280 V135','M560 110 H840 V135'];
  for(const offset of [0,560]){
   paths.push(`M${405+offset} 165 H${515+offset} V275 H${395+offset} V300`,...(state.view==='overview'?[`M${230+offset} 195 V210`,`M${265+offset} 234 H${300+offset}`]:[]),`M${395+offset} 355 V395`,`M${395+offset} 455 V480 H${178+offset} V505`,`M${395+offset} 480 V505`,`M${395+offset} 560 V600`,`M${300+offset} 630 H${178+offset} V565`);
   if(state.view==='network')paths.push(`M${300+offset} 425 H${280+offset} V234 H${265+offset}`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 690" role="group" aria-label="${state.locale==='es'?'Arquitectura de Goliat Forge':'Goliat Forge architecture'}"><defs><style>text{font-family:Arial,sans-serif;fill:#23414f;font-size:14px;font-weight:600}.subtitle{font-size:11px;font-weight:400;fill:#617885}.diagram-label{font-size:10px;letter-spacing:1px;fill:#557080}.diagram-wire{fill:none;stroke:#9db7bc;stroke-width:1.3;stroke-dasharray:4 4;marker-end:url(#arrow)}.diagram-zone{fill:#eff5f5;stroke:#cedfdf;stroke-dasharray:4 4}.diagram-zone.prod{fill:#f8f3eb;stroke:#e3d9cd}.diagram-node rect{fill:white;stroke:#cbdcde;stroke-width:1;rx:9}.diagram-node.shared rect{fill:#f1f5ed;stroke:#c7d7c4}.diagram-node.edge rect{fill:#fff8f0;stroke:#eccba6}.diagram-node.selected rect{stroke:#567866;stroke-width:2}.diagram-muted{opacity:.22}.diagram-node{cursor:pointer}.diagram-node:focus{outline:none}.diagram-node:focus rect{stroke:#b55026;stroke-width:2}</style><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#9db7bc"/></marker></defs><rect x="30" y="10" width="1060" height="93" rx="12" fill="#f0f4ed"/><text x="55" y="122" class="diagram-label">${t.managed}</text>${['dev','prod'].map((env,i)=>`<g class="${state.environment!=='all'&&state.environment!==env?'diagram-muted':''}"><rect x="${50+i*560}" y="280" width="470" height="390" rx="13" class="diagram-zone ${env}"/><text x="${70+i*560}" y="300" class="diagram-label">${env.toUpperCase()} · ${t.private}</text></g>`).join('')}${paths.map(path=>`<path class="diagram-wire" d="${path}"/>`).join('')}${all.map(n=>{const words=t[n.key],muted=n.env&&state.environment!=='all'&&state.environment!==n.env;return`<g role="button" tabindex="0" data-node="${n.id}" aria-label="${esc((n.env?n.env+' · ':'')+words[0])}" aria-pressed="${state.selected===n.id}" class="diagram-node ${n.kind} ${state.selected===n.id?'selected':''} ${muted?'diagram-muted':''}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" ${['queue','worker'].includes(n.key)?'stroke-dasharray="5 4"':''}/><text x="${n.x+15}" y="${n.y+23}">${esc(words[0])}</text><text class="subtitle" x="${n.x+15}" y="${n.y+40}">${esc(words[1])}</text></g>`;}).join('')}</svg>`;
}
export function createDiagram({container,onSelect=()=>{},locale='es',view='overview',environment='all',selected='waf'}={}) {
 const state={locale,view,environment,selected};
 function render(){
  const t=texts[state.locale],all=diagramNodes(state);
  container.innerHTML=renderDiagramSvg(state);
  const chosen=all.find(n=>n.id===state.selected)||all.find(n=>n.id==='waf');
  onSelect({...chosen,title:t[chosen.key][0],description:t[chosen.key][2],access:t[chosen.key][3],module:t[chosen.key][4]});
 }
 function select(event){const button=event.target.closest('[data-node]');if(button){state.selected=button.dataset.node;render();container.querySelector(`[data-node="${state.selected}"]`)?.focus({preventScroll:true});}}
 container.addEventListener('click',select);
 container.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.closest('[data-node]')){event.preventDefault();select(event);}});
 render();
 return {update(value){Object.assign(state,value);render();}};
}
