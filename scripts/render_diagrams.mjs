/** One SVG renderer supplies the live diagram and readable, committed fallbacks. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {renderDiagramSvg} from '../site/diagram.js';
const root=new URL('../',import.meta.url),check=process.argv.includes('--check');
async function output(path,content){const url=new URL(path,root);if(check){if(await readFile(url,'utf8')!==content)throw Error('Outdated generated diagram: '+path);}else await writeFile(url,content);}
await mkdir(new URL('site/diagrams/',root),{recursive:true});
for(const view of ['overview','network']){
 await output('site/assets/architecture-'+view+'.svg',renderDiagramSvg({view})+'\n');
 const html=`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Goliat Forge · Arquitectura</title><link rel="icon" href="../assets/favicon.svg"><link rel="stylesheet" href="../styles.css"><script type="module" src="../standalone.js"></script></head>
<body class="standalone"><div class="standalone-heading"><a href="../index.html#architecture" data-label="back">Volver al producto</a><strong data-label="title">Goliat Forge · Arquitectura</strong></div><div class="diagram-shell"><div class="diagram-toolbar"><div class="diagram-tabs"><button data-diagram="overview" data-label="overview">Arquitectura</button><button data-diagram="network" data-label="network">Red y seguridad</button></div><div class="diagram-filters"><button data-environment="all" aria-pressed="true" data-label="all">Todo</button><button data-environment="dev" aria-pressed="false">Dev</button><button data-environment="prod" aria-pressed="false">Prod</button></div></div><div class="diagram-layout"><div class="diagram-scroll"><div class="architecture-map" id="architecture-map"><img class="diagram-fallback" src="../assets/architecture-${view}.svg" width="1120" height="690" alt="Arquitectura AWS: plataforma compartida y entornos Dev y Prod privados"></div></div><aside class="node-detail"><h3 id="node-title">CloudFront + WAF</h3><p id="node-description">Una entrada pública protegida. API y datos en la red privada de cada entorno.</p><dl><dt data-label="access">Acceso</dt><dd id="node-access">HTTPS público · orígenes privados</dd><dt data-label="module">Módulo</dt><dd id="node-module">modules/edge</dd></dl><a class="text-link" id="node-source" href="../docs/modules/edge.html" data-label="source">Ver módulo</a></aside></div></div></body></html>\n`;
 await output('site/diagrams/'+view+'.html',html);
}
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const translations=JSON.parse(await readFile(new URL('site/content/es.json',root),'utf8'));
const config=await readFile(new URL('environments/dev.auto.tfvars.example',root),'utf8');
let index=await readFile(new URL('site/index.html',root),'utf8');
const product=JSON.parse(await readFile(new URL('site/content/product.json',root),'utf8'));
const imageVersion=createHash('sha256').update(await readFile(new URL('site/assets/social-card.png',root))).digest('hex').slice(0,12);
const shareImage=product.site_url.replace(/\/$/,'')+'/assets/social-card.png?v='+imageVersion;
index=index.replace(/(<meta (?:property|name)="(?:og:image(?::secure_url)?|twitter:image)" content=")[^"]*(")/g,(_match,start,end)=>start+escape(shareImage)+end);
index=index.replace(/<([\w-]+)([^>]*data-i18n="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g,(_match,tag,attrs,key)=>'<'+tag+attrs+'>'+escape(translations[key])+'</'+tag+'>');
index=index.replace(/<code id="config-code">[\s\S]*?<\/code>/,'<code id="config-code">'+escape(config)+'</code>');
await output('site/index.html',index);
await output('site/index.htm',index);
console.log(check?'Diagram sources and fallbacks are synchronized.':'SVG fallbacks, source diagram pages and index.htm generated.');
