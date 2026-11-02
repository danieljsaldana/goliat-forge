import argparse
from contextlib import redirect_stdout
import io,json,os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from forgecli import cli

class ConfigurationTests(unittest.TestCase):
    def test_configure_keeps_comments_and_creates_no_cloud_resources(self):
        with tempfile.TemporaryDirectory() as temporary,patch.object(cli,'run') as run:
            output=Path(temporary)/'config'
            args=argparse.Namespace(name='myforge',region='eu-west-1',config=output,demo=False)
            with redirect_stdout(io.StringIO()):cli.configure(args)
            self.assertIn('"myforge"',(output/'common.tfvars').read_text())
            self.assertIn('#',(output/'prod.tfvars').read_text())
            self.assertEqual(cli.installation(output)['environments'],['dev','prod'])
            self.assertEqual((output/'.installation.json').stat().st_mode & 0o777,0o600)
            run.assert_not_called()
            with self.assertRaises(RuntimeError):cli.configure(args)
    def test_invalid_installation_name_and_region_are_rejected(self):
        for name,region in [('../other','eu-west-1'),('forge','invalid')]:
            with self.assertRaises(RuntimeError):cli.configure(argparse.Namespace(name=name,region=region,config=Path('/unused'),demo=False))
    def test_apply_uses_the_exact_saved_plan(self):
        with tempfile.TemporaryDirectory() as temporary,patch.object(cli,'tf') as tf:
            folder=Path(temporary);plan=cli.planned(folder,'dev',['-var-file=example'],apply=True)
            self.assertIn('-out='+str(plan),tf.call_args_list[0].args[2])
            self.assertEqual(tf.call_args_list[1].args[2],['apply','-input=false',str(plan)])
    def test_destroy_rejects_wrong_confirmation_before_bootstrap(self):
        with tempfile.TemporaryDirectory() as temporary,patch.object(cli.shutil,'which',return_value='/bin/true'),patch.object(cli,'bootstrap') as bootstrap:
            config=Path(temporary);cli.write_private(config/'.installation.json',{'name':'myforge','region':'eu-west-1','environments':['dev','prod']})
            args=argparse.Namespace(command='destroy',config=config,environment='dev',yes=True,confirm='wrong',destroy_shared=False)
            with self.assertRaisesRegex(RuntimeError,'Teardown requires'):cli.operate(args)
            bootstrap.assert_not_called()
    def test_selection_cannot_cross_demo_and_product(self):
        settings={'environments':['demo']}
        self.assertEqual(cli.selected(settings,'all'),['demo'])
        with self.assertRaises(RuntimeError):cli.selected(settings,'prod')

if __name__=='__main__':unittest.main()
