"""Exercise mocked Terraform configurations; never use real AWS credentials."""
from pathlib import Path
import json,os,re,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
TARGETS=['stacks/environment','modules/network','modules/database','modules/edge','modules/events','modules/service','modules/identity']

def check_dependencies(env, archive):
    """Check real graph edges that mocked providers cannot validate at apply time."""
    folder=ROOT/'.forge/test-fixtures/dependency-graph'
    folder.mkdir(parents=True,exist_ok=True)
    config={
        'terraform':{'required_providers':{'aws':{'source':'hashicorp/aws'}}},
        'module':{'environment':{
            # Keep a relative local source so nested modules stay in one package.
            'source':os.path.relpath(ROOT/'stacks/environment',folder),
            'common':{'name':'forge','region':'eu-west-1'},
            'environment':{'name':'dev','vpc_cidr':'10.40.0.0/16'},
            'platform':{
                'name':'forge','region':'eu-west-1',
                'ecr_url':'000000000000.dkr.ecr.eu-west-1.amazonaws.com/forge/api',
                'ecr_arn':'arn:aws:ecr:eu-west-1:000000000000:repository/forge/api',
                'waf_arn':'arn:aws:wafv2:us-east-1:000000000000:global/webacl/example/00000000-0000-4000-8000-000000000000',
            },
            'api_image':'000000000000.dkr.ecr.eu-west-1.amazonaws.com/forge/api@sha256:'+'0'*64,
            'worker_archive':str(archive),
        }},
    }
    (folder/'main.tf.json').write_text(json.dumps(config))
    graph_env=dict(env,TF_DATA_DIR=str(ROOT/'.forge/test-data/dependency-graph'))
    subprocess.run(['terraform',f'-chdir={folder}','init','-backend=false','-input=false','-no-color'],env=graph_env,check=True)
    result=subprocess.run(['terraform',f'-chdir={folder}','graph','-type=plan'],env=graph_env,check=True,capture_output=True,text=True)
    edges=re.findall(r'"([^"\n]+)"\s*->\s*"([^"\n]+)"',result.stdout)
    graph={}
    for consumer,dependency in edges:graph.setdefault(consumer,set()).add(dependency)
    nodes={node for edge in edges for node in edge}

    def node(address):
        expected=f'[root] module.environment.{address} (expand)'
        if expected not in nodes:raise AssertionError(f'Terraform graph is missing {address}')
        return expected

    def reaches(consumer,dependency):
        pending=[node(consumer)];target=node(dependency);seen=set()
        while pending:
            current=pending.pop()
            if current==target:return True
            if current not in seen:
                seen.add(current);pending.extend(graph.get(current,set()))
        return False

    checks=[
        ('module.edge.aws_cloudfront_vpc_origin.api','module.network.aws_internet_gateway.this'),
        ('module.service.aws_ecs_service.api','module.service.aws_iam_role_policy.execution'),
        ('module.service.aws_ecs_service.api','module.service.aws_iam_role_policy.api'),
        ('module.service.aws_ecs_task_definition.migration','module.service.aws_iam_role_policy.migration'),
        ('module.service.aws_ecs_task_definition.migration','module.service.aws_iam_role_policy.execution'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_endpoint.interface'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_endpoint.s3'),
        ('module.service.aws_ecs_service.api','module.network.aws_route_table_association.app'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_security_group_ingress_rule.app'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_security_group_egress_rule.database'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_security_group_egress_rule.endpoints'),
        ('module.service.aws_ecs_service.api','module.network.aws_vpc_security_group_egress_rule.s3'),
        ('module.edge.aws_lb.api','module.network.aws_vpc_security_group_ingress_rule.alb'),
        ('module.edge.aws_lb.api','module.network.aws_vpc_security_group_egress_rule.alb'),
        ('module.events.aws_lambda_function.worker','module.network.aws_vpc_endpoint.interface'),
        ('module.events.aws_lambda_function.worker','module.network.aws_vpc_security_group_egress_rule.database'),
        ('module.events.aws_lambda_function.worker','module.network.aws_vpc_security_group_egress_rule.endpoints'),
        ('module.database.aws_db_subnet_group.this','module.network.aws_route_table_association.data'),
        ('module.database.aws_db_instance.this','module.network.aws_vpc_security_group_ingress_rule.database'),
        ('module.service.aws_ecs_service.api','module.database.aws_rds_cluster_instance.writer'),
        ('module.service.aws_ecs_service.api','module.database.aws_docdb_cluster_instance.writer'),
        ('module.events.aws_lambda_function.worker','module.database.aws_rds_cluster_instance.writer'),
        ('module.events.aws_lambda_function.worker','module.database.aws_docdb_cluster_instance.writer'),
        ('module.network.aws_flow_log.this','module.network.aws_iam_role_policy.flow'),
        ('module.events.aws_lambda_function.worker','module.events.aws_iam_role_policy.worker'),
        ('module.identity.aws_lambda_function.keys','module.identity.aws_iam_role_policy.keys'),
    ]
    failures=[f'{consumer} must wait for {dependency}' for consumer,dependency in checks if not reaches(consumer,dependency)]
    if failures:raise AssertionError('Unsafe Terraform deployment order:\n'+'\n'.join(failures))
    print(f'Terraform dependency graph: {len(checks)} startup/teardown checks passed.',flush=True)

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
    check_dependencies(env,fixture)

if __name__=='__main__':main()
