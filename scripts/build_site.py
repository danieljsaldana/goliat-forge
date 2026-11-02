"""Build an entirely static product website from public, allowlisted source."""
from pathlib import Path
from html import escape
import hashlib
import json
import os
import re
import shutil
import unicodedata
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
SITE=ROOT/'site'

def is_github_pages_url(value):
    parsed=urlsplit(value or '')
    return parsed.scheme=='https' and bool(re.fullmatch(r'[a-zA-Z0-9-]+\.github\.io',parsed.hostname or '')) and parsed.username is None and parsed.password is None

def slug(value):
    value=unicodedata.normalize('NFKD',re.sub(r'[`*]','',value))
    return re.sub(r'[^a-z0-9]+','-',value.encode('ascii','ignore').decode().lower()).strip('-')

def relative(target, current):
    return os.path.relpath(target,current.parent).replace(os.sep,'/')

def target_for(source):
    if source.suffix=='.md':return OUT/source.relative_to(ROOT).with_suffix('.html')
    if 'modules' in source.parts and source.suffix=='.tf':return OUT/'docs/modules'/f'{source.relative_to(ROOT/"modules").parts[0]}.html'
    return OUT/'source'/source.relative_to(ROOT).with_name(source.name+'.html')

def inline(text,source,current):
    slots=[]
    def reserve(html):slots.append(html);return f'\x00{len(slots)-1}\x00'
    def link(match):
        label,url=match[1],match[2]
        parsed=urlsplit(url)
        if not parsed.scheme and not url.startswith('#'):
            path=(source.parent/parsed.path).resolve()
            if path.is_file() and ROOT in path.parents:
                if path.suffix in ['.md','.tf','.tfvars','.example']:url=relative(target_for(path),current)+(('#'+parsed.fragment) if parsed.fragment else ('#'+slug(path.name) if path.suffix=='.tf' and 'modules' in path.parts else ''))
        return reserve('<a href="'+escape(url,quote=True)+'">'+escape(label)+'</a>')
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text)
    text=re.sub(r'`([^`]+)`',lambda m:reserve('<code>'+escape(m[1])+'</code>'),text)
    text=escape(text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
    for index,html in enumerate(slots):text=text.replace(f'\x00{index}\x00',html)
    return text

def markdown(text,source,current):
    output=[];paragraph=[];code=[];fenced=False;listed=False;table=[]
    def flush():
        if paragraph:output.append('<p>'+inline(' '.join(paragraph),source,current)+'</p>');paragraph.clear()
    def table_flush():
        if not table:return
        rows=[row for row in table if not re.fullmatch(r'[\s|:-]+',row)]
        output.append('<div class="doc-table"><table>')
        for index,row in enumerate(rows):
            tag='th' if index==0 else 'td'
            output.append('<tr>'+''.join(f'<{tag}>'+inline(cell.strip(),source,current)+f'</{tag}>' for cell in row.strip().strip('|').split('|'))+'</tr>')
        output.append('</table></div>');table.clear()
    for line in text.splitlines():
        if line.startswith('```'):
            flush();table_flush()
            if listed:output.append('</ul>');listed=False
            if fenced:output.append('<pre><code>'+escape('\n'.join(code))+'</code></pre>');code.clear()
            fenced=not fenced;continue
        if fenced:code.append(line);continue
        if line.startswith('|'):flush();table.append(line);continue
        table_flush()
        if not line.strip():
            flush()
            if listed:output.append('</ul>');listed=False
            continue
        heading=re.match(r'^(#{1,6})\s+(.+)',line)
        if heading:
            flush()
            if listed:output.append('</ul>');listed=False
            level=len(heading[1]);output.append(f'<h{level} id="{slug(heading[2])}">'+inline(heading[2],source,current)+f'</h{level}>');continue
        if line.startswith('- '):
            flush()
            if not listed:output.append('<ul>');listed=True
            output.append('<li>'+inline(line[2:],source,current)+'</li>');continue
        paragraph.append(line)
    flush();table_flush()
    if listed:output.append('</ul>')
    return '\n'.join(output)

def document(title,body,path,language='es'):
    path.parent.mkdir(parents=True,exist_ok=True)
    base=relative(OUT/'styles.css',path)
    home=relative(OUT/'index.html',path)
    script=relative(OUT/'doc.js',path)
    path.write_text(f'<!doctype html><html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="Daniel J. Saldaña"><title>{escape(title)} · Goliat Forge</title><link rel="stylesheet" href="{base}"><script src="{script}" defer></script></head><body><main class="doc-main"><a href="{home}">← Goliat Forge</a>{body}</main></body></html>')

def translate_html(html,language):
    values=json.loads((SITE/f'content/{language}.json').read_text())
    def replace(match):
        tag,attributes,key=match[1],match[2],match[3]
        return f'<{tag}{attributes}>{escape(values[key])}</{tag}>'
    html=re.sub(r'<([\w-]+)([^>]*data-i18n="([^"]+)"[^>]*)>.*?</\1>',replace,html,flags=re.S)
    html=html.replace('<html lang="es">',f'<html lang="{language}">')
    if language=='en':html=html.replace('<head>','<head><base href="../">',1)
    return html

def build():
    if OUT.is_symlink():raise RuntimeError('dist must be a generated directory, not a symlink')
    if OUT.exists():shutil.rmtree(OUT)
    OUT.mkdir()
    # Copy only website source/assets. Never publish workspaces, state, env files or archives.
    for filename in ['styles.css','diagram.js','lab.js','github.js','standalone.js']:
        shutil.copyfile(SITE/filename,OUT/filename)
    shutil.copytree(SITE/'assets',OUT/'assets',dirs_exist_ok=True)
    icon_version=hashlib.sha256((OUT/'assets/icons.svg').read_bytes()).hexdigest()[:12]
    def version_icons(text):
        return re.sub(r'assets/icons[.]svg(?:[?]v=[a-f0-9]{12})?#','assets/icons.svg?v='+icon_version+'#',text)
    shutil.copytree(SITE/'content',OUT/'content',dirs_exist_ok=True)
    shutil.copyfile(ROOT/'apps/shared/domain.mjs',OUT/'domain.mjs')
    for name in ['common','dev','prod']:
        for suffix in ['tfvars','auto.tfvars.example']:shutil.copyfile(ROOT/f'environments/{name}.{suffix}',OUT/f'content/{name}.{suffix}')
    shutil.copyfile(ROOT/'examples/demo/demo.auto.tfvars.example',OUT/'content/demo.auto.tfvars.example')
    product=json.loads((SITE/'content/product.json').read_text());product['version']=(ROOT/'VERSION').read_text().strip()
    original_repository=product.get('repository')
    repository=os.environ.get('GITHUB_REPOSITORY')
    if repository and re.fullmatch(r'[\w-]+/[\w.-]+',repository):
        product['repository']='https://github.com/'+repository
        derived_url='https://'+repository.split('/')[0]+'.github.io/'+repository.split('/')[1]+'/'
        if not product.get('site_url') or (product['repository']!=original_repository and is_github_pages_url(product['site_url'])):product['site_url']=derived_url
    product['site_url']=os.environ.get('GOLIAT_SITE_URL') or product.get('site_url')
    (OUT/'content/product.json').write_text(json.dumps(product,ensure_ascii=False,indent=2)+'\n')
    snapshot=json.loads((SITE/'content/github-stars.json').read_text())
    valid_snapshot=snapshot.get('repository')==product.get('repository') and type(snapshot.get('count')) is int and snapshot['count']>=0
    hashes={};active=set()
    def module(name):
        if name in hashes:return hashes[name]
        if name in active:raise RuntimeError('Unexpected JavaScript import cycle')
        active.add(name)
        source=(ROOT/'apps/shared/domain.mjs') if name=='domain.mjs' else SITE/name
        text=version_icons(source.read_text()).replace("from '../apps/shared/domain.mjs'","from './domain.mjs'")
        def dependency(match):
            target=match[2][2:]
            return match[1]+match[2]+'?v='+module(target)+match[3]
        text=re.sub(r"((?:from\s+|import\(\s*)['\"])(\./[\w.-]+\.(?:js|mjs))(['\"])",dependency,text)
        (OUT/name).write_text(text)
        hashes[name]=hashlib.sha256(text.encode()).hexdigest()[:12];active.remove(name);return hashes[name]
    for name in ['app.js','standalone.js']:module(name)
    stylesheet_hash=hashlib.sha256((SITE/'styles.css').read_bytes()).hexdigest()[:12]
    social_image_hash=hashlib.sha256((OUT/'assets/social-card.png').read_bytes()).hexdigest()[:12]
    html=version_icons((SITE/'index.html').read_text()).replace('href="styles.css"',f'href="styles.css?v={stylesheet_hash}"').replace('src="app.js"',f'src="app.js?v={hashes["app.js"]}"')
    if original_repository and product.get('repository')!=original_repository:html=html.replace(original_repository,product['repository'])
    html=re.sub(r'(<span[^>]*data-version[^>]*>).*?(</span>)',lambda m:m[1]+'v'+product['version']+m[2],html)
    if valid_snapshot:
        html=html.replace('data-github-stars hidden','data-github-stars')
        html=re.sub(r'(<span data-github-count>).*?(</span>)',lambda match:match[1]+str(snapshot['count'])+match[2],html)
    for language in ['es','en']:
        page=translate_html(html,language)
        title='Goliat Forge · Modular AWS architecture' if language=='en' else 'Goliat Forge · Arquitectura modular para AWS'
        page=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',page)
        description=('A modular AWS reference architecture with Terraform, shared platform services, isolated Dev and Prod, private workloads and configurable data engines.' if language=='en' else 'Arquitectura AWS modular con Terraform, plataforma compartida, Dev y Prod aislados, cargas privadas y motores de datos configurables.')
        def meta(key,value):
            nonlocal page
            pattern=r'(<meta (?:name|property)="'+re.escape(key)+r'" content=")[^"]*(")'
            page=re.sub(pattern,lambda match:match[1]+escape(value,quote=True)+match[2],page)
        for key in ['og:title','twitter:title']:meta(key,title)
        for key in ['description','og:description','twitter:description']:meta(key,description)
        meta('og:locale','en_US' if language=='en' else 'es_ES')
        meta('og:locale:alternate','es_ES' if language=='en' else 'en_US')
        image_alt='Goliat Forge: shared AWS foundation and isolated Dev and Prod architectures' if language=='en' else 'Goliat Forge: plataforma AWS compartida y arquitecturas Dev y Prod aisladas'
        for key in ['og:image:alt','twitter:image:alt']:meta(key,image_alt)
        if product['site_url']:
            canonical=product['site_url'].rstrip('/')+('/en/' if language=='en' else '/')
            page=re.sub(r'<link rel="canonical"[^>]*>','',page)
            page=page.replace('</head>','<link rel="canonical" href="'+escape(canonical,quote=True)+'"></head>')
            meta('og:url',canonical)
            share_image=product['site_url'].rstrip('/')+'/assets/social-card.png?v='+social_image_hash
            for key in ['og:image','og:image:secure_url','twitter:image']:meta(key,share_image)
        output=OUT/('en' if language=='en' else '')
        output.mkdir(exist_ok=True);(output/'index.html').write_text(page)
    shutil.copyfile(OUT/'index.html',OUT/'index.htm')
    (OUT/'site').mkdir(exist_ok=True)
    # Legacy entry URLs also expose previews to crawlers that do not follow meta refresh.
    home_head=re.search(r'<head>([\s\S]*?)</head>',(OUT/'index.html').read_text()).group(1)
    preview_head='\n'.join(re.findall(r'<meta\b[^>]*>|<title>[\s\S]*?</title>|<link rel="(?:canonical|author)"[^>]*>',home_head))
    for suffix in ['html','htm']:(OUT/f'site/index.{suffix}').write_text('<!doctype html><html lang="es"><head>'+preview_head+'\n<meta http-equiv="refresh" content="0;url=../"></head><body><a href="../">Goliat Forge</a></body></html>')
    (OUT/'doc.js').write_text("const u=new URL(location.href);if(u.searchParams.get('lang')==='en'&&u.pathname.includes('/docs/')&&!u.pathname.includes('/modules/')&&!u.pathname.endsWith('.en.html')){u.pathname=u.pathname.replace(/\\.html$/,'.en.html');u.searchParams.delete('lang');location.replace(u);}")
    sources=[*ROOT.glob('README*.md'),*ROOT.glob('CONTRIBUTING*.md'),ROOT/'SECURITY.md',ROOT/'CODE_OF_CONDUCT.md',ROOT/'LICENSING.md',ROOT/'examples/demo/README.md',ROOT/'examples/databases/README.md',*sorted((ROOT/'docs').glob('*.md'))]
    for source in sources:
        output=target_for(source);body=markdown(source.read_text(),source,output)
        document(source.read_text().splitlines()[0].lstrip('# '),body,output,'en' if source.name.endswith('.en.md') or source.name=='README.md' else 'es')
    for folder in sorted((ROOT/'modules').iterdir()):
        if not folder.is_dir():continue
        output=OUT/f'docs/modules/{folder.name}.html'
        body=markdown((folder/'README.md').read_text(),folder/'README.md',output)
        for source in sorted(folder.glob('*.tf')):body+=f'<details class="source-block" id="{slug(source.name)}"><summary>{escape(source.name)}</summary><pre><code>{escape(source.read_text())}</code></pre></details>'
        document(folder.name,body,output)
    for folder in ['environments','examples/demo','examples/databases']:
        for source in sorted((ROOT/folder).glob('*')):
            if source.suffix not in ['.tfvars','.example']:continue
            output=target_for(source);document(str(source.relative_to(ROOT)),'<h1>'+escape(source.name)+'</h1><pre><code>'+escape(source.read_text())+'</code></pre>',output)
    for view in ['overview','network']:
        path=OUT/f'diagrams/{view}.html';path.parent.mkdir(exist_ok=True)
        page=version_icons((SITE/f'diagrams/{view}.html').read_text())
        path.write_text(page.replace('src="../standalone.js"',f'src="../standalone.js?v={hashes["standalone.js"]}"').replace('href="../styles.css"',f'href="../styles.css?v={stylesheet_hash}"'))
    for view in ['overview','network']:
        alias=OUT/f'site/diagrams/{view}.html';alias.parent.mkdir(parents=True,exist_ok=True)
        alias.write_text('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../../diagrams/'+view+'.html"></head><body><a href="../../diagrams/'+view+'.html">Goliat Forge · Architecture</a></body></html>')
    for name in ['LICENSE','NOTICE']:shutil.copyfile(ROOT/name,OUT/name)
    (OUT/'.nojekyll').write_text('')
    print('Goliat Forge static website: dist/ · ES/EN, source-derived documentation and standalone diagrams.')

if __name__=='__main__':build()
