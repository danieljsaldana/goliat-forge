"""Build the Next.js static frontend and derive exact CSP hashes for its inline scripts."""
from pathlib import Path
from html.parser import HTMLParser
import base64
import hashlib
import json
import os
import subprocess
import shutil

ROOT = Path(__file__).resolve().parents[1]

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = False
        self.parts = []
        self.hashes = set()
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.active = 'src' not in dict(attrs)
            self.parts = []
    def handle_data(self, data):
        if self.active:
            self.parts.append(data)
    def handle_endtag(self, tag):
        if tag == 'script' and self.active:
            content = ''.join(self.parts)
            if content.strip():
                digest = base64.b64encode(hashlib.sha256(content.encode()).digest()).decode()
                self.hashes.add('sha256-' + digest)
            self.active = False

def build():
    environment = dict(os.environ, NEXT_TELEMETRY_DISABLED='1')
    subprocess.run(['npm', 'run', 'build', '--prefix', 'apps/web'], cwd=ROOT, env=environment, check=True)
    for name in ['LICENSE', 'NOTICE']:
        shutil.copyfile(ROOT/name, ROOT/'apps/web/out'/name)
    hashes = set()
    for path in (ROOT/'apps/web/out').rglob('*.html'):
        parser = Scripts()
        parser.feed(path.read_text())
        hashes.update(parser.hashes)
    destination = ROOT/'.forge/artifacts/frontend-csp.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps({'frontend_script_hashes': sorted(hashes)}, indent=2)+'\n')
    print('Next.js static export: apps/web/out/ · exact CSP script hashes: '+str(len(hashes)))
    return sorted(hashes)

if __name__ == '__main__':
    build()
