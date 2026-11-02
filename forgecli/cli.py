import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(arguments, *, env=None, capture=False, input=None, check=True):
    result = subprocess.run([str(x) for x in arguments], cwd=ROOT, env=env, input=input,
                            text=True, capture_output=capture, check=False)
    if check and result.returncode:
        if capture and result.stderr:
            print(result.stderr.strip(), file=sys.stderr)
        raise RuntimeError(f'{arguments[0]} failed ({result.returncode}); no later stage was applied.')
    return result


def write_private(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')
    path.chmod(0o600)


def paths(config):
    config = config.resolve()
    folder = ROOT / '.forge' / hashlib.sha256(str(config).encode()).hexdigest()[:12]
    folder.mkdir(parents=True, exist_ok=True)
    return config, folder


@contextmanager
def exclusive(folder):
    with (folder / 'operation.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError('Another operation is using this installation.') from error
        yield


def installation(config):
    path = config / '.installation.json'
    if not path.is_file():
        raise RuntimeError('Run ./forge configure into .local/ first. Source examples cannot be deployed directly.')
    value = json.loads(path.read_text())
    if not re.fullmatch(r'[a-z][a-z0-9-]{2,15}', value.get('name', '')) or not re.fullmatch(r'[a-z]{2}-[a-z]+-[0-9]', value.get('region', '')):
        raise RuntimeError('Invalid installation metadata.')
    environments = value.get('environments')
    if not isinstance(environments,list) or not environments or any(item not in ['dev','prod','demo'] for item in environments) or len(set(environments)) != len(environments) or ('demo' in environments and len(environments) != 1):
        raise RuntimeError('Invalid installation environment list.')
    return value


def configure(args):
    if not re.fullmatch(r'[a-z][a-z0-9-]{2,15}', args.name) or not re.fullmatch(r'[a-z]{2}-[a-z]+-[0-9]', args.region):
        raise RuntimeError('Use a 3–16 character lowercase installation name and an AWS region.')
    output = args.config.resolve()
    if output.exists() and any(output.iterdir()):
        raise RuntimeError('Choose an empty configuration directory; existing settings are never overwritten.')
    output.mkdir(parents=True, exist_ok=True)
    source = ROOT / ('examples/demo' if args.demo else 'environments')
    names = ['common.tfvars', 'demo.tfvars'] if args.demo else ['common.tfvars', 'dev.tfvars', 'prod.tfvars']
    for name in names:
        value = (source / name).read_text()
        if name == 'common.tfvars':
            value = re.sub(r'(name\s*=\s*)"[^"]+"', lambda match: match[1] + json.dumps(args.name), value, count=1)
            value = re.sub(r'(region\s*=\s*)"[^"]+"', lambda match: match[1] + json.dumps(args.region), value, count=1)
        (output / name).write_text(value)
    for template in ['common.auto.tfvars.example','local.auto.tfvars.example', *(['demo.auto.tfvars.example'] if args.demo else ['dev.auto.tfvars.example','prod.auto.tfvars.example'])]:
        source_template = source/template if (source/template).exists() else ROOT/'environments'/template
        value = source_template.read_text()
        if template.startswith('common.'):
            value = re.sub(r'(name\s*=\s*)"[^"]+"', lambda match: match[1]+json.dumps(args.name), value, count=1)
            value = re.sub(r'(region\s*=\s*)"[^"]+"', lambda match: match[1]+json.dumps(args.region), value, count=1)
        (output/template).write_text(value)
    write_private(output / '.installation.json', {'name': args.name, 'region': args.region, 'environments': ['demo'] if args.demo else ['dev', 'prod']})
    print(f'Configuration: {output}\nEdit the commented tfvars before deployment. No AWS resources were created.')


def tf_environment(folder, stack):
    value = dict(os.environ)
    value['TF_DATA_DIR'] = str(folder / 'terraform' / stack)
    value['TF_IN_AUTOMATION'] = '1'
    value.setdefault('TF_PLUGIN_CACHE_DIR', str(ROOT/'.forge/plugin-cache'))
    Path(value['TF_PLUGIN_CACHE_DIR']).mkdir(parents=True, exist_ok=True)
    Path(value['TF_DATA_DIR']).mkdir(parents=True, exist_ok=True)
    return value


def tf(folder, stack, arguments, *, capture=False, check=True):
    code = 'environment' if stack in ['dev', 'prod', 'demo'] else stack
    environment = tf_environment(folder, stack)
    command = ['terraform', f'-chdir={ROOT / "stacks" / code}', *arguments]
    if arguments and arguments[0] == 'init':
        # Serialize cache writers even when two installations initialize together.
        with (Path(environment['TF_PLUGIN_CACHE_DIR'])/'.forge-init.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            return run(command, env=environment, capture=capture, check=check)
    return run(command, env=environment, capture=capture, check=check)


def output(folder, stack, key):
    return json.loads(tf(folder, stack, ['output', '-json', key], capture=True).stdout)


def initialize(folder, stack, backend=None, installation_name=None):
    arguments = ['init', '-input=false', '-reconfigure']
    if stack == 'state':
        state = folder / 'bootstrap' / 'terraform.tfstate'
        state.parent.mkdir(parents=True, exist_ok=True)
        arguments.append('-backend-config=path=' + str(state))
    else:
        for key, value in backend.items():
            arguments.append(f'-backend-config={key}={str(value).lower() if isinstance(value, bool) else value}')
        arguments.append(f'-backend-config=key={installation_name}/{stack}/terraform.tfstate')
    tf(folder, stack, arguments)


def planned(folder, stack, variables, *, apply=False, destroy=False):
    path = folder / 'plans' / f'{stack}{"-destroy" if destroy else ""}.tfplan'
    path.parent.mkdir(parents=True, exist_ok=True)
    tf(folder, stack, ['plan', '-input=false', '-lock-timeout=60s', *( ['-destroy'] if destroy else [] ), *variables, '-out=' + str(path)])
    if apply:
        # Always apply the exact saved file. Never generate a fresh implicit plan.
        tf(folder, stack, ['apply', '-input=false', str(path)])
    return path


def bootstrap(config, folder, *, apply):
    settings = installation(config)
    current = run(['aws', 'sts', 'get-caller-identity', '--output', 'json'], capture=True)
    account = json.loads(current.stdout)['Account']
    backend_file = folder / 'backend.json'
    if backend_file.exists():
        saved = json.loads(backend_file.read_text())
        if saved['account_id'] != account:
            raise RuntimeError('The current AWS account does not match this installation backend.')
        return saved['backend']
    if not apply:
        raise RuntimeError('No backend exists yet. Review ./forge bootstrap --config ... --yes first.')
    initialize(folder, 'state')
    planned(folder, 'state', [f'-var=name={settings["name"]}', f'-var=region={settings["region"]}'], apply=True)
    backend = output(folder, 'state', 'backend')
    write_private(backend_file, {'account_id': account, 'backend': backend})
    return backend


def config_arguments(config, environment=None):
    files = [config / 'common.tfvars']
    shared_override = config/'common.auto.tfvars'
    if shared_override.is_file():
        files.append(shared_override)
    if environment:
        files.append(config / f'{environment}.tfvars')
    for path in files:
        if not path.is_file():
            raise RuntimeError(f'Missing configuration: {path}')
    return ['-var-file=' + str(path) for path in files]


def runtime_arguments(config, folder, environment, *, active):
    path = folder / 'runtime' / f'{environment}.auto.tfvars.json'
    if not path.exists():
        raise RuntimeError('Build/publish the image and worker with ./forge deploy before planning a workload.')
    value = json.loads(path.read_text())
    value['activate_workloads'] = active
    write_private(path, value)
    arguments = [*config_arguments(config, environment), '-var-file=' + str(path)]
    for local in [config/'local.auto.tfvars', config/f'{environment}.auto.tfvars']:
        if local.is_file():
            arguments.append('-var-file=' + str(local))
    return arguments


def image_digest(platform, folder):
    files = [ROOT/'package.json', ROOT/'package-lock.json']
    files.extend(p for source in ['apps/api', 'apps/shared'] for p in (ROOT/source).rglob('*') if p.is_file())
    source_hash = hashlib.sha256()
    for path in sorted(files):
        source_hash.update(str(path.relative_to(ROOT)).encode()); source_hash.update(path.read_bytes())
    tag = 'src-' + source_hash.hexdigest()[:20]
    repository = platform['ecr_url'].split('/', 1)[1]
    query = ['aws', 'ecr', 'describe-images', '--region', platform['region'], '--repository-name', repository, '--image-ids', 'imageTag='+tag, '--output', 'json']
    existing = run(query, capture=True, check=False)
    if existing.returncode:
        if 'ImageNotFoundException' not in existing.stderr:
            raise RuntimeError('Cannot query the installation image repository; check IAM permissions.')
        token = run(['aws','ecr','get-login-password','--region',platform['region']],capture=True).stdout.strip()
        # Docker's short-lived login cache is outside the repository and removed on exit.
        with tempfile.TemporaryDirectory(prefix='forge-docker-') as temporary:
            env = dict(os.environ, DOCKER_CONFIG=temporary)
            run(['docker','login','--username','AWS','--password-stdin',platform['ecr_url'].split('/')[0]],env=env,input=token,capture=True)
            run(['docker','buildx','build','--platform','linux/arm64','--provenance=false','--tag',platform['ecr_url']+':'+tag,'--push','--file','apps/api/Dockerfile','.'],env=env)
        existing = run(query,capture=True)
    digest = json.loads(existing.stdout)['imageDetails'][0]['imageDigest']
    if not re.fullmatch(r'sha256:[a-f0-9]{64}',digest):
        raise RuntimeError('ECR returned an invalid immutable digest.')
    return platform['ecr_url']+'@'+digest


def migrate(info, folder):
    network = {'awsvpcConfiguration':{'subnets':info['app_subnets'],'securityGroups':[info['app_security_group']],'assignPublicIp':'DISABLED'}}
    value = json.loads(run(['aws','ecs','run-task','--region',info['region'],'--cluster',info['cluster'],'--launch-type','FARGATE','--task-definition',info['migration_task'],'--network-configuration',json.dumps(network),'--output','json'],capture=True).stdout)
    if value.get('failures') or len(value.get('tasks',[])) != 1:
        raise RuntimeError('The private migration task could not start.')
    arn = value['tasks'][0]['taskArn']
    write_private(folder/'migration-task.json',{'taskArn':arn,'region':info['region'],'cluster':info['cluster']})
    run(['aws','ecs','wait','tasks-stopped','--region',info['region'],'--cluster',info['cluster'],'--tasks',arn])
    task = json.loads(run(['aws','ecs','describe-tasks','--region',info['region'],'--cluster',info['cluster'],'--tasks',arn,'--output','json'],capture=True).stdout)['tasks'][0]
    if len(task.get('containers',[])) != 1 or task['containers'][0].get('exitCode') != 0:
        raise RuntimeError('Database migration failed; workloads were not activated. Inspect the private migration logs.')


def selected(settings, selection):
    values = settings['environments'] if selection == 'all' else [selection]
    if not all(value in settings['environments'] for value in values):
        raise RuntimeError('The environment does not belong to this configuration directory.')
    return values


def operate(args):
    config, folder = paths(args.config)
    settings = installation(config)
    with exclusive(folder):
        apply = args.command in ['deploy','bootstrap','destroy']
        if apply and not args.yes:
            raise RuntimeError('Review the configuration and use --yes to run a billable deployment or reviewed teardown.')
        for program in ['terraform','aws'] + (['docker','node','npm'] if args.command == 'deploy' else []):
            if not shutil.which(program): raise RuntimeError(f'Required command not found: {program}')
        if args.command == 'deploy':
            run(['docker','info'],capture=True)
            if not (ROOT/'node_modules/pg').is_dir(): raise RuntimeError('Run npm ci before deploying.')
        if args.command == 'destroy':
            if args.confirm != settings['name']: raise RuntimeError('Teardown requires --confirm with the installation name.')
            if args.destroy_shared and args.environment != 'all': raise RuntimeError('Shared teardown requires --environment all.')
        backend = bootstrap(config,folder,apply=args.command in ['deploy','bootstrap'])
        if args.command == 'bootstrap': return
        initialize(folder,'shared',backend,settings['name'])
        if args.command == 'plan':
            planned(folder,'shared',config_arguments(config))
        elif args.command == 'deploy':
            planned(folder,'shared',config_arguments(config),apply=True)
        platform = output(folder,'shared','platform')
        environments = selected(settings,args.environment)
        if args.command == 'deploy':
            image = image_digest(platform,folder)
            run(['npm','ci','--prefix','apps/web','--ignore-scripts','--no-audit','--no-fund'])
            run([sys.executable,'scripts/build_frontend.py'])
            run([sys.executable,'scripts/package_worker.py'])
            frontend_csp = json.loads((ROOT/'.forge/artifacts/frontend-csp.json').read_text())
        for environment in reversed(environments) if args.command == 'destroy' else environments:
            initialize(folder,environment,backend,settings['name'])
            existing = tf(folder,environment,['output','-json','installation'],capture=True,check=False)
            current = json.loads(existing.stdout) if existing.returncode == 0 and existing.stdout.strip() else None
            if args.command == 'status':
                print(json.dumps(current,indent=2)); continue
            if args.command == 'deploy':
                write_private(folder/'runtime'/f'{environment}.auto.tfvars.json',{**frontend_csp,'platform':platform,'api_image':image,'worker_archive':str(ROOT/'.forge/artifacts/worker.zip'),'activate_workloads':bool(current and current['active'])})
            active = args.command != 'deploy' or bool(current and current['active'])
            arguments = runtime_arguments(config,folder,environment,active=active)
            if args.command == 'destroy':
                if args.confirm != settings['name']: raise RuntimeError('Teardown requires --confirm with the installation name.')
                planned(folder,environment,arguments,apply=True,destroy=True); continue
            planned(folder,environment,arguments,apply=args.command=='deploy')
            if args.command == 'deploy':
                info = output(folder,environment,'installation')
                migrate(info,folder)
                planned(folder,environment,runtime_arguments(config,folder,environment,active=True),apply=True)
                info = output(folder,environment,'installation')
                # Preserve Terraform-owned config.json. No other object prefix is managed by this publisher.
                run(['aws','s3','sync','apps/web/out/_next/static/',f's3://{info["bucket"]}/_next/static/','--region',info['region'],'--cache-control','public,max-age=31536000,immutable'])
                run(['aws','s3','sync','apps/web/out/',f's3://{info["bucket"]}/','--region',info['region'],'--exclude','config.json','--exclude','_next/static/*','--cache-control','no-cache'])
                run(['aws','cloudfront','create-invalidation','--distribution-id',info['distribution_id'],'--paths','/*'],capture=True)
                run(['aws','ecs','wait','services-stable','--region',info['region'],'--cluster',info['cluster'],'--services',info['service']])
                print(json.dumps({'environment':environment,'urls':info['portals']},indent=2))
        if args.command == 'destroy' and args.destroy_shared:
            if args.environment != 'all': raise RuntimeError('Shared teardown requires --environment all.')
            for environment in settings['environments']:
                initialize(folder,environment,backend,settings['name'])
                resources = tf(folder,environment,['state','list'],capture=True).stdout.strip()
                if resources: raise RuntimeError('Shared resources are retained while any environment state still contains resources.')
            planned(folder,'shared',config_arguments(config),apply=True,destroy=True)
        if args.command == 'destroy':
            print('The encrypted state backend is deliberately retained. Database/S3/ECR protections must be reviewed explicitly; no data purge is automatic.')


def use_backend(args):
    config,folder=paths(args.config)
    installation(config)
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]',args.bucket):raise RuntimeError('Invalid state bucket name.')
    identity=json.loads(run(['aws','sts','get-caller-identity','--output','json'],capture=True).stdout)
    account=identity['Account']
    if not re.fullmatch(r'arn:aws:kms:[a-z0-9-]+:'+account+r':key/[a-f0-9-]{36}',args.kms_key):raise RuntimeError('Use the state KMS key ARN in the current AWS account.')
    run(['aws','s3api','head-bucket','--bucket',args.bucket,'--expected-bucket-owner',account],capture=True)
    version=json.loads(run(['aws','s3api','get-bucket-versioning','--bucket',args.bucket,'--output','json'],capture=True).stdout)
    if version.get('Status')!='Enabled':raise RuntimeError('The existing backend must have S3 versioning enabled.')
    value={'account_id':account,'backend':{'bucket':args.bucket,'region':args.region,'kms_key_id':args.kms_key,'encrypt':True,'use_lockfile':True}}
    path=folder/'backend.json'
    if path.exists() and json.loads(path.read_text())!=value:raise RuntimeError('A different backend is already configured; it was not overwritten.')
    write_private(path,value)
    print('Existing state backend configured locally. No AWS resources were created.')


def check():
    folder = ROOT/'.forge/check'
    run(['terraform','fmt','-check','-recursive','modules','stacks','environments','examples'])
    for stack in ['state','shared','environment']:
        tf(folder,stack,['init','-backend=false','-input=false'])
        tf(folder,stack,['validate'])
    print('Terraform configuration validated without deploying AWS resources.')


def main():
    parser = argparse.ArgumentParser(description='Goliat Forge · AWS application platform')
    parser.add_argument('--profile',help='Existing AWS CLI/SSO profile; no IAM users or long-lived keys are created.')
    sub = parser.add_subparsers(dest='command',required=True)
    setup = sub.add_parser('configure'); setup.add_argument('--name',required=True); setup.add_argument('--region',default='eu-west-1'); setup.add_argument('--config',type=Path,default=ROOT/'.local/config'); setup.add_argument('--demo',action='store_true')
    backend=sub.add_parser('use-backend');backend.add_argument('--config',type=Path,required=True);backend.add_argument('--bucket',required=True);backend.add_argument('--region',default='eu-west-1');backend.add_argument('--kms-key',required=True)
    sub.add_parser('check')
    for command in ['bootstrap','plan','deploy','status','destroy']:
        action = sub.add_parser(command); action.add_argument('--config',type=Path,required=True); action.add_argument('--environment',choices=['dev','prod','demo','all'],default='dev'); action.add_argument('--yes',action='store_true'); action.add_argument('--confirm'); action.add_argument('--destroy-shared',action='store_true')
    args = parser.parse_args()
    if args.profile: os.environ['AWS_PROFILE']=args.profile
    try:
        if args.command == 'configure': configure(args)
        elif args.command == 'check': check()
        elif args.command == 'use-backend': use_backend(args)
        else: operate(args)
    except (RuntimeError, OSError, ValueError, KeyboardInterrupt) as error:
        print(f'Forge: {error}',file=sys.stderr); raise SystemExit(1)
