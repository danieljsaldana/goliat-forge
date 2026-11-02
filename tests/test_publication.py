from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
import tempfile,unittest
spec=spec_from_file_location('publication',Path(__file__).parents[1]/'scripts/check_publication.py');publication=module_from_spec(spec);spec.loader.exec_module(publication)
class PublicationTests(unittest.TestCase):
 def scan(self,name,text):
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/name;path.write_text(text);return publication.inspect(path,Path(name))
 def test_detects_credentials_without_exposing_the_value(self):
  self.assertIn('credential/private-key pattern',self.scan('example.txt','A'+'KIA'+'Z'*16))
  self.assertIn('credential/private-key pattern',self.scan('example.txt','-----BEGIN '+'PRIVATE KEY-----'))
 def test_real_inputs_and_zip_files_cannot_be_published(self):
  self.assertIn('real auto tfvars',self.scan('dev.auto.tfvars','environment={}'))
  self.assertIn('runtime/archive/private-key artifact',self.scan('worker.zip','generated'))
 def test_example_metadata_is_allowed_but_real_account_ids_are_not(self):
  self.assertEqual(self.scan('example.tf','account="000000000000"'),[])
  self.assertIn('non-example account metadata',self.scan('example.tf','account="'+'123456'+'789012'+'"'))
if __name__=='__main__':unittest.main()
