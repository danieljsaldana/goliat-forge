"""Guard the public configuration contract and CLI override precedence."""
from pathlib import Path
import re,tempfile,json,unittest
from forgecli import cli
ROOT=Path(__file__).resolve().parents[1]
class PublicConfiguration(unittest.TestCase):
    def fields(self,source,indent):
        return set(re.findall(r'^ {'+str(indent)+r'}([a-z_]+)\s*=',source,re.M))
    def test_environment_auto_templates_cover_every_public_option(self):
        source=(ROOT/'stacks/environment/variables.tf').read_text().split('  validation {',1)[0]
        fields=self.fields(source,4)
        for name in ['dev','prod']:
            template=(ROOT/f'environments/{name}.auto.tfvars.example').read_text()
            self.assertEqual(fields,self.fields(template,2),name)
            for nested in ['instance_class','promotion_tier','availability_zone','label','view']:
                self.assertIn(nested,template)
    def test_shared_auto_template_covers_all_shared_options(self):
        source=(ROOT/'stacks/environment/common.tf').read_text().split('  validation {',1)[0]
        self.assertEqual(self.fields(source,4),self.fields((ROOT/'environments/common.auto.tfvars.example').read_text(),2))
    def test_advanced_template_is_inert_and_documents_every_internal_input(self):
        source=(ROOT/'stacks/environment/variables.tf').read_text()
        names=set(re.findall(r'^variable "([a-z_]+)"',source,re.M))-{'environment'}
        template=(ROOT/'environments/local.auto.tfvars.example').read_text()
        self.assertFalse([line for line in template.splitlines() if line.strip() and not line.lstrip().startswith('#')])
        for name in names:self.assertIn(name,template)
    def test_overrides_apply_to_shared_and_environment_in_documented_order(self):
        with tempfile.TemporaryDirectory() as temporary:
            config=Path(temporary)/'config';config.mkdir()
            for name in ['common.tfvars','common.auto.tfvars','dev.tfvars','local.auto.tfvars','dev.auto.tfvars']:(config/name).write_text('# example\n')
            workspace=Path(temporary)/'workspace'
            cli.write_private(workspace/'runtime/dev.auto.tfvars.json',{'activate_workloads':False})
            shared=cli.config_arguments(config)
            self.assertEqual(shared,['-var-file='+str(config/name) for name in ['common.tfvars','common.auto.tfvars']])
            args=cli.runtime_arguments(config,workspace,'dev',active=True)
            expected=[config/'common.tfvars',config/'common.auto.tfvars',config/'dev.tfvars',workspace/'runtime/dev.auto.tfvars.json',config/'local.auto.tfvars',config/'dev.auto.tfvars']
            self.assertEqual(args,['-var-file='+str(path) for path in expected])
            self.assertTrue(json.loads((workspace/'runtime/dev.auto.tfvars.json').read_text())['activate_workloads'])
