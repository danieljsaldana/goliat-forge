"""Exercise mocked Terraform configurations; never use real AWS credentials."""
from pathlib import Path
import os,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
TARGETS=['stacks/environment','modules/network','modules/database','modules/edge','modules/events','modules/service','modules/identity']

def main():
    fixture=ROOT/'.forge/test-fixtures/worker.zip';fixture.parent.mkdir(parents=True,exist_ok=True)
    # Mocked-provider tests need an existing filename, never a deployable runtime.
    with zipfile.ZipFile(fixture,'w') as archive:archive.writestr('MOCK_ONLY.txt','Terraform mock fixture; never deploy this archive.')
    cache=ROOT/'.forge/plugin-cache';cache.mkdir(parents=True,exist_ok=True)
    for target in TARGETS:
        tests=list((ROOT/target/'tests').glob('*.tftest.hcl'))
        if not tests or any('mock_provider "aws"' not in file.read_text() for file in tests):raise RuntimeError('Terraform test lacks an explicit mocked AWS provider')
        data=ROOT/'.forge/test-data'/target.replace('/','-');data.mkdir(parents=True,exist_ok=True)
        env=dict(os.environ,TF_PLUGIN_CACHE_DIR=str(cache),TF_DATA_DIR=str(data),AWS_ACCESS_KEY_ID='test',AWS_SECRET_ACCESS_KEY='test',AWS_EC2_METADATA_DISABLED='true')
        env.pop('AWS_PROFILE',None);env.pop('AWS_SESSION_TOKEN',None)
        for command in [['init','-backend=false','-input=false','-no-color'],['test','-no-color']]:
            subprocess.run(['terraform',f'-chdir={ROOT/target}',*command],env=env,check=True)

if __name__=='__main__':main()
