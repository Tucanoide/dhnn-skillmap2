#!/usr/bin/env python3
"""Cache-busting for app/shared.css and app/api.js.

Rewrites the `?v=...` query string on every reference to shared.css / api.js
in app/*.html so it matches a short hash of that file's current content.
The version only changes when the file's content actually changes, so you
never have to remember to bump anything by hand — just run this after
editing shared.css or api.js (or wire it into a pre-commit hook).

Usage: python3 scripts/bump_cache_version.py
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
ASSETS = ["shared.css", "api.js"]


def content_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def main() -> None:
    versions = {name: content_hash(APP / name) for name in ASSETS if (APP / name).exists()}

    changed_files = []
    for html_file in sorted(APP.glob("*.html")):
        text = html_file.read_text()
        original = text
        for name, version in versions.items():
            # Matches: name  |  name?v=anything   -> name?v=<hash>
            pattern = re.compile(re.escape(name) + r"(\?v=[^\"'\s]*)?")
            text = pattern.sub(f"{name}?v={version}", text)
        if text != original:
            html_file.write_text(text)
            changed_files.append(html_file.name)

    for name, version in versions.items():
        print(f"{name}: v={version}")
    if changed_files:
        print("Updated:", ", ".join(changed_files))
    else:
        print("Already up to date.")


if __name__ == "__main__":
    main()
