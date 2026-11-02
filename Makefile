.PHONY: check test terraform-test site site-check site-serve demo
check:
	./forge check
	python3 scripts/check_publication.py

test:
	npm test
	python3 -m unittest discover -s tests -p 'test_*.py' -v

terraform-test:
	python3 scripts/test_terraform.py

site:
	python3 scripts/build_site.py

frontend:
	npm run setup:web
	npm run build:web

site-check: site frontend
	python3 scripts/check_site.py
	npm run test:site

site-serve: site
	python3 -m http.server 8768 --bind 127.0.0.1 --directory dist

demo:
	npm run demo
