"""Check local website destinations, metadata, translations and SVG icon references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import hashlib,json
import re,struct
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.base=None;self.keys=set()
        self.metadata={};self.canonicals=[];self.title='';self.in_head=False;self.in_title=False;self.language=None
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if tag=='html':self.language=data.get('lang')
        if tag=='head':self.in_head=True
        if self.in_head:
            if tag=='title':self.in_title=True
            if tag=='meta':
                key=data.get('property') or data.get('name')
                if key:self.metadata.setdefault(key,[]).append(data.get('content',''))
            if tag=='link' and data.get('rel')=='canonical':self.canonicals.append(data.get('href',''))
        if tag=='base': self.base=data.get('href'); return
        if 'data-i18n' in data:self.keys.add(data['data-i18n'])
        for attribute in ['href','src']:
            if data.get(attribute):self.links.append(data[attribute])
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='head':self.in_head=False
    def handle_data(self,data):
        if self.in_title:self.title+=data

def check_social_metadata(page,site_url,image_version,language):
    parser=Links();parser.feed(page.read_text());errors=[]
    label=str(page.relative_to(OUT))
    canonical=site_url.rstrip('/')+('/en/' if language=='en' else '/')
    image=site_url.rstrip('/')+'/assets/social-card.png?v='+image_version
    required=['description','author','og:type','og:site_name','og:title','og:description',
              'og:url','og:locale','og:locale:alternate','og:image','og:image:secure_url',
              'og:image:type','og:image:width','og:image:height','og:image:alt',
              'twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']
    for key in required:
        values=parser.metadata.get(key,[])
        if len(values)!=1 or not values[0].strip():errors.append(f'{label}: expected exactly one nonempty {key} in head')
    if parser.canonicals!=[canonical]:errors.append(f'{label}: canonical must match the published language URL')
    if parser.language!=language:errors.append(f'{label}: document language does not match its URL')
    expected={
        'og:type':'website','og:url':canonical,'og:locale':'en_US' if language=='en' else 'es_ES',
        'og:locale:alternate':'es_ES' if language=='en' else 'en_US',
        'og:image':image,'og:image:secure_url':image,'twitter:image':image,
        'og:image:type':'image/png','og:image:width':'1200','og:image:height':'630',
        'twitter:card':'summary_large_image','og:title':parser.title.strip(),'twitter:title':parser.title.strip(),
    }
    for key,value in expected.items():
        if parser.metadata.get(key)!=[value]:errors.append(f'{label}: incorrect {key}')
    for key in ['og:description','twitter:description']:
        if parser.metadata.get(key)!=parser.metadata.get('description'):errors.append(f'{label}: inconsistent {key}')
    url=urlsplit(canonical)
    if url.scheme!='https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        errors.append(f'{label}: expected a public HTTPS canonical URL without credentials, query or fragment')
    return errors
def main():
    errors=[];count=0
    dictionaries=[json.loads((ROOT/f'site/content/{language}.json').read_text()) for language in ['es','en']]
    if dictionaries[0].keys()!=dictionaries[1].keys():errors.append('Translation keys differ')
    for path in OUT.rglob('*.html'):
        count+=1; parser=Links();parser.feed(path.read_text());base=path.parent
        if parser.base:base=(base/parser.base).resolve()
        for key in parser.keys:
            if any(key not in d for d in dictionaries):errors.append(f'Missing translation {key}')
        for link in parser.links:
            url=urlsplit(link)
            if url.scheme or url.netloc or not url.path:continue
            target=(OUT/url.path.lstrip('/') if url.path.startswith('/') else base/unquote(url.path)).resolve()
            if OUT.resolve() not in target.parents and target!=OUT.resolve():errors.append(f'Escaping link: {path.relative_to(OUT)}: {link}');continue
            if target.is_dir():target=target/'index.html'
            if not target.exists():errors.append(f'Missing destination: {path.relative_to(OUT)}: {link}')
            elif target.suffix=='.svg' and url.fragment and not re.search(r'\bid=[\"\']'+re.escape(url.fragment)+r'[\"\']',target.read_text()):errors.append(f'Missing icon: {link}')
    card=OUT/'assets/social-card.png'
    if not card.is_file():errors.append('Missing share image')
    else:
        image=card.read_bytes()
        if len(image)<24 or image[:8]!=b'\x89PNG\r\n\x1a\n' or image[12:16]!=b'IHDR':errors.append('Social image is not a PNG')
        elif struct.unpack('>II',image[16:24])!=(1200,630):errors.append('Social image must be 1200×630')
        version=hashlib.sha256(image).hexdigest()[:12]
        product=json.loads((OUT/'content/product.json').read_text())
        for path,language in [('index.html','es'),('index.htm','es'),('en/index.html','en'),('site/index.html','es'),('site/index.htm','es')]:
            errors.extend(check_social_metadata(OUT/path,product['site_url'],version,language))

    if errors:raise SystemExit('\n'.join(sorted(set(errors))))
    print(f'Website checks passed: {count} HTML documents, local destinations, ES/EN keys, icons and social preview metadata.')
if __name__=='__main__':main()
