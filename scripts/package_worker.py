"""Build a deterministic Lambda artifact from versioned source, never a committed ZIP."""
from pathlib import Path
import zipfile,json
ROOT=Path(__file__).resolve().parents[1]

def package():
    destination=ROOT/'.forge/artifacts/worker.zip'
    destination.parent.mkdir(parents=True,exist_ok=True)
    lock=json.loads((ROOT/'package-lock.json').read_text())
    dev_packages={Path(name) for name,info in lock['packages'].items() if name and info.get('dev')}
    sources=[ROOT/'package.json',ROOT/'LICENSE',ROOT/'NOTICE']
    for name in ['apps/shared','apps/worker','apps/identity','node_modules']:
        source=ROOT/name
        if not source.is_dir(): raise RuntimeError('Run npm ci before packaging Lambda.')
        for path in source.rglob('*'):
            relative=path.relative_to(ROOT/'node_modules') if name=='node_modules' else path.relative_to(ROOT)
            if name=='node_modules' and (relative.parts[0]=='.bin' or any(parent in dev_packages for parent in [path.relative_to(ROOT),*path.relative_to(ROOT).parents])): continue
            if path.is_file() and not path.is_symlink(): sources.append(path)
    with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(sources):
            name=path.relative_to(ROOT).as_posix()
            info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
            archive.writestr(info,path.read_bytes())
    print(f'Lambda artifact generated locally: {destination}')
    return destination

if __name__=='__main__': package()
