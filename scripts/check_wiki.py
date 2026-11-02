"""Validate the bilingual GitHub wiki sources without network access."""

from pathlib import Path
import argparse
import re
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/danieljsaldana/goliat-forge"
PAIRS = (
    ("Arquitectura", "Architecture"),
    ("Inicio-rapido", "Quickstart"),
    ("Configuracion", "Configuration"),
    ("Modulos", "Terraform-modules"),
    ("Bases-de-datos-e-IAM", "Databases-and-IAM"),
    ("Aplicacion-de-ejemplo", "Example-application"),
    ("Seguridad", "Security"),
    ("Operacion", "Operations"),
    ("Costes", "Costs"),
    ("Produccion-y-problemas", "Production-and-troubleshooting"),
    ("Desarrollo-y-contribuciones", "Development-and-contributing"),
)
LINK = re.compile(r"\[[^\]\n]+\]\(([^\s)]+)\)")


def check(folder):
    expected = {"Home", "_Sidebar", "_Footer"} | {
        slug for pair in PAIRS for slug in pair
    }
    files = {path.stem: path for path in folder.glob("*.md")}
    problems = []
    if set(files) != expected:
        problems.append(f"Page set differs: missing={expected - set(files)}, extra={set(files) - expected}")
    navigation = {}
    for slug, path in files.items():
        content = path.read_text(encoding="utf-8")
        if not content.strip():
            problems.append(f"{slug}: empty page")
        if slug not in {"_Sidebar", "_Footer"} and not content.startswith("# "):
            problems.append(f"{slug}: missing main heading")
        if sum(line.startswith("```") for line in content.splitlines()) % 2:
            problems.append(f"{slug}: unbalanced code fences")
        if re.search(r"\b(?:REPO|WIKI|SITE)/|TODO|FIXME|/Users/", content):
            problems.append(f"{slug}: unresolved or private placeholder")
        navigation[slug] = set()
        for target in LINK.findall(content):
            clean = urlsplit(target)
            if target.startswith(REPOSITORY + "/wiki/"):
                destination = unquote(clean.path.rsplit("/", 1)[-1])
                if destination not in expected:
                    problems.append(f"{slug}: missing wiki page {destination}")
                navigation[slug].add(destination)
            for kind in ("blob", "tree"):
                prefix = REPOSITORY + f"/{kind}/main/"
                if target.startswith(prefix):
                    relative = unquote(clean.path.split(f"/{kind}/main/", 1)[1])
                    if not (ROOT / relative).exists():
                        problems.append(f"{slug}: missing repository path {relative}")
        if slug not in {"Home", "_Sidebar", "_Footer"} and "Home" not in navigation[slug]:
            problems.append(f"{slug}: missing Home navigation")
    for es, en in PAIRS:
        if en not in navigation.get(es, set()) or es not in navigation.get(en, set()):
            problems.append(f"Missing language switch for {es}/{en}")
    for slug in ("Home", "_Sidebar"):
        missing = (expected - {"Home", "_Sidebar", "_Footer"}) - navigation.get(slug, set())
        if missing:
            problems.append(f"{slug}: incomplete guide navigation {missing}")
    if problems:
        raise SystemExit("\n".join(problems))
    print(f"Wiki checks passed: {len(files)} pages, {len(PAIRS)} language pairs; navigation and source links resolve.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path, nargs="?", default=ROOT / "docs/wiki")
    check(parser.parse_args().folder)
