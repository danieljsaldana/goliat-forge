"""Check local website destinations, metadata, translations and SVG icon references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json
import re,struct
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.base=None; self.keys=set()
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if tag=='base': self.base=data.get('href'); return
        if 'data-i18n' in data:self.keys.add(data['data-i18n'])
        for attribute in ['href','src']:
            if data.get(attribute):self.links.append(data[attribute])
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
    elif struct.unpack('>II',card.read_bytes()[16:24])!=(1200,630):errors.append('Social image must be 1200×630')
    for page in [OUT/'index.html',OUT/'en/index.html']:
        text=page.read_text()
        canonicals=re.findall(r'<link rel="canonical" href="([^"]+)"',text)
        if len(canonicals)!=1 or not canonicals[0].startswith('https://'):errors.append('Expected exactly one public canonical URL: '+str(page.relative_to(OUT)))
        for key in ['og:image','twitter:image','og:url']:
            values=re.findall(r'<meta (?:property|name)="'+key+r'" content="([^"]+)"',text)
            if len(values)!=1 or not values[0].startswith('https://'):errors.append('Missing/relative social metadata '+key+': '+str(page.relative_to(OUT)))
        for key in ['og:image:width','og:image:height','og:image:alt','twitter:image:alt']:
            if key not in text:errors.append('Missing social image attribute '+key)

    if errors:raise SystemExit('\n'.join(sorted(set(errors))))
    print(f'Website checks passed: {count} HTML documents, local destinations, ES/EN keys, icons and share image.')
if __name__=='__main__':main()
