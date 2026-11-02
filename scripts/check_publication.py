"""High-confidence publication checks; complements secret scanners and review."""
from pathlib import Path
import argparse,json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
TOKENS=[re.compile(r'(?:AKIA|ASIA)[A-Z0-9]{16}'),re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}'),re.compile(r'github_pat_[A-Za-z0-9_]{40,}'),re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
ACCOUNT=re.compile(r'(?<![A-Za-z0-9])[0-9]{12}(?![A-Za-z0-9])')
ALLOWED_ACCOUNTS={'000000000000','111122223333'}
BINARY={'.png','.jpg','.jpeg','.gif','.woff2','.ico'}

def inspect(path,relative):
    problems=[]
    if path.suffix in {'.zip','.tfstate','.tfplan','.key','.pem'} or '.tfstate.' in path.name:problems.append('runtime/archive/private-key artifact')
    if path.name.startswith('.env') and path.name!='.env.example':problems.append('environment file')
    if path.name.endswith(('.auto.tfvars','.auto.tfvars.json')):problems.append('real auto tfvars')
    if any(part in {'.forge','.local','.terraform','node_modules'} for part in relative.parts):problems.append('private workspace/dependency directory')
    if path.suffix not in BINARY:
        text=path.read_text(errors='replace')
        if any(pattern.search(text) for pattern in TOKENS):problems.append('credential/private-key pattern')
        if path.suffix!='.crt' and any(value not in ALLOWED_ACCOUNTS for value in ACCOUNT.findall(text)):problems.append('non-example account metadata')
        if re.search(r'/(?:Users|home)/[a-zA-Z][a-zA-Z0-9_-]+/',text):problems.append('machine-specific home path')
    return problems

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--artifacts',type=Path);args=parser.parse_args()
    if args.artifacts:
        folder=args.artifacts.resolve();files=[p for p in folder.rglob('*') if p.is_file()];pairs=[(p,p.relative_to(folder)) for p in files]
    else:
        raw=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT)
        pairs=[(ROOT/name,Path(name)) for name in raw.decode().split('\0') if name and (ROOT/name).is_file()]
    findings=[(str(relative),problem) for path,relative in pairs for problem in inspect(path,relative)]
    if findings:
        for path,problem in findings:print(f'{path}: {problem}',file=sys.stderr)
        raise SystemExit(1)
    print(f'Publication checks passed: {len(pairs)} files; no detected credentials, real account metadata or generated archives.')

if __name__=='__main__':main()
