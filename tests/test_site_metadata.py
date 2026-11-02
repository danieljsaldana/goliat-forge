import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('site_builder',Path(__file__).resolve().parents[1]/'scripts/build_site.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class SiteMetadataTests(unittest.TestCase):
    def test_pages_hostname_is_recognized_for_fork_metadata(self):
        self.assertTrue(builder.is_github_pages_url('https://example.github.io/product/'))

    def test_path_query_and_lookalike_host_cannot_replace_a_custom_domain(self):
        for url in ['https://example.org/.github.io/product/',
                    'https://example.org/?next=https://example.github.io/',
                    'https://example.github.io.example.org/product/',
                    'https://examplegithub.io/product/',
                    'https://example.github.io@example.org/product/',
                    'https://user@example.github.io/product/']:
            with self.subTest(url=url):
                self.assertFalse(builder.is_github_pages_url(url))

    def test_missing_and_non_https_urls_are_not_pages_origins(self):
        for url in [None,'','http://example.github.io/product/','/example.github.io/']:
            with self.subTest(url=url):
                self.assertFalse(builder.is_github_pages_url(url))
