"""Regenerate the public resource catalog directly from Terraform declarations."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def generate():
    entries=[]
    for source in sorted((ROOT/'modules').glob('*/*.tf')):
        for kind,name in re.findall(r'^resource\s+"([^"]+)"\s+"([^"]+)"',source.read_text(),re.M):
            entries.append({'module':source.parent.name,'type':kind,'name':name,'source':source.relative_to(ROOT).as_posix()})
    (ROOT/'docs/resources.json').write_text(json.dumps(entries,indent=2)+'\n')
    for language in ['es','en']:
        title='Recursos del producto' if language=='es' else 'Product resources'
        text='Catálogo derivado del código Terraform. Cuenta declaraciones; count, for_each, db_kind y flags determinan qué se crea. No es un inventario de AWS.' if language=='es' else 'Catalog derived from Terraform source. It lists declarations; count, for_each, db_kind and flags determine what is created. It is not an AWS inventory.'
        suffix='' if language=='es' else '.en'
        body=f'# {title}\n\n{text}\n\n| Module | Terraform resource | Source |\n| --- | --- | --- |\n'
        for row in entries:body+=f'| {row["module"]} | `{row["type"]}.{row["name"]}` | [{row["source"]}](../{row["source"]}) |\n'
        (ROOT/f'docs/resources{suffix}.md').write_text(body)
    print(f'Resource catalog regenerated: {len(entries)} declarations across selectable profiles.')
if __name__=='__main__':generate()
