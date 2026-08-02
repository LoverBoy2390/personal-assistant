from __future__ import annotations

import base64
import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")

required = [
    "index.html", "manifest.webmanifest", "icon.svg", "sw.js", "server.py",
    "news_feeds.json", "MOBILE_ACCEPTANCE.md", "SECURITY_NOTES.md", "README.md", "CHANGELOG.md",
]
missing = [name for name in required if not (ROOT / name).is_file()]
assert not missing, f"Missing files: {missing}"

for marker in [
    "AEGIS LifeOS v0.4.1", "const VERSION='0.4.1'", "Permission Center",
    "Connection Center", "storageStatusPill", "validateBackupBundle",
    "env(safe-area-inset-bottom)", "grid-template-columns:repeat(4,1fr)",
]:
    assert marker in HTML, f"Missing marker: {marker}"

assert "const VERSION='0.4.0'" not in HTML
assert "AEGIS LifeOS v0.2" not in HTML
assert "localStorage.setItem(META_KEY" not in HTML
assert "localStorage.setItem(VAULT_KEY" not in HTML


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])

collector = IdCollector()
collector.feed(HTML)
duplicates = [name for name, count in Counter(collector.ids).items() if count > 1]
assert not duplicates, f"Duplicate HTML IDs: {duplicates}"

scripts = re.findall(r"<script[^>]*>(.*?)</script>", HTML, flags=re.I | re.S)
assert len(scripts) == 1, f"Expected one inline script, found {len(scripts)}"
script_hash = base64.b64encode(hashlib.sha256(scripts[0].encode()).digest()).decode()
assert f"sha256-{script_hash}" in HTML, "Static CSP script hash mismatch"

manifest = json.loads((ROOT / "manifest.webmanifest").read_text())
assert manifest["name"] == "AEGIS LifeOS v0.4.1"
assert manifest["start_url"] == "./" and manifest["scope"] == "./"

server = (ROOT / "server.py").read_text()
assert 'APP_VERSION = "0.4.1"' in server
assert "Cross-Origin-Opener-Policy" in server
assert "Cache-Control" in server

sw = (ROOT / "sw.js").read_text()
assert "aegis-v0.4.1" in sw
assert "event.request.mode==='navigate'" in sw

print(json.dumps({
    "ok": True,
    "version": "0.4.1",
    "inlineScriptSha256": hashlib.sha256(scripts[0].encode()).hexdigest(),
    "requiredFiles": len(required),
}, indent=2))
