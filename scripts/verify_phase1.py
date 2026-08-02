#!/usr/bin/env python3
"""Verify the AEGIS Gate 1 synthetic-coach and encrypted-vault boundary."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "aegis-synthetic-coach"
REQUIRED = [
    APP / "index.html",
    APP / "styles.css",
    APP / "vault.css",
    APP / "fixtures.mjs",
    APP / "coach-engine.mjs",
    APP / "app.mjs",
    APP / "vault-core.mjs",
    APP / "vault-browser.mjs",
    APP / "vault-ui.mjs",
    APP / "sw.js",
    APP / "README.md",
    ROOT / "tests" / "synthetic-coach.test.mjs",
    ROOT / "tests" / "vault.test.mjs",
    ROOT / "tests" / "browser-smoke.mjs",
    ROOT / "docs" / "security" / "PHASE1_SYNTHETIC_COACH.md",
    ROOT / "docs" / "security" / "PHASE1_LOCAL_TEST_RECORD.md",
    ROOT / ".github" / "workflows" / "phase1-synthetic-coach.yml",
]

PROHIBITED_EGRESS = {
    "network fetch call": re.compile(r"\bfetch\s*\("),
    "XMLHttpRequest": re.compile(r"\bXMLHttpRequest\b"),
    "WebSocket": re.compile(r"\bWebSocket\b"),
    "EventSource": re.compile(r"\bEventSource\b"),
    "beacon": re.compile(r"navigator\.sendBeacon"),
}
PROHIBITED_STORAGE = {
    "localStorage": re.compile(r"\blocalStorage\b"),
    "sessionStorage": re.compile(r"\bsessionStorage\b"),
    "document cookie": re.compile(r"document\.cookie"),
    "browser credentials API": re.compile(r"navigator\.credentials"),
}
RUNTIME_FILES = [
    APP / "index.html",
    APP / "fixtures.mjs",
    APP / "coach-engine.mjs",
    APP / "app.mjs",
    APP / "vault-core.mjs",
    APP / "vault-browser.mjs",
    APP / "vault-ui.mjs",
]


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED:
        if not path.is_file():
            errors.append(f"missing required Gate 1 file: {path.relative_to(ROOT)}")

    fixture = APP / "fixtures.mjs"
    if fixture.is_file() and not re.search(r"\bsynthetic\s*:\s*true\b", fixture.read_text(encoding="utf-8")):
        errors.append("fixture is not explicitly marked synthetic: true")

    for path in RUNTIME_FILES:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for label, pattern in PROHIBITED_EGRESS.items():
            if pattern.search(text):
                errors.append(f"prohibited runtime capability ({label}) in {path.relative_to(ROOT)}")
        for label, pattern in PROHIBITED_STORAGE.items():
            if pattern.search(text):
                errors.append(f"prohibited storage capability ({label}) in {path.relative_to(ROOT)}")
        if path.name != "vault-browser.mjs" and re.search(r"\bindexedDB\b", text, re.I):
            errors.append(f"IndexedDB use is isolated to vault-browser.mjs, found in {path.relative_to(ROOT)}")
        if path.name != "vault-browser.mjs" and re.search(r"\bBroadcastChannel\b", text):
            errors.append(f"BroadcastChannel use is isolated to vault-browser.mjs, found in {path.relative_to(ROOT)}")

    vault_core = APP / "vault-core.mjs"
    if vault_core.is_file():
        text = vault_core.read_text(encoding="utf-8")
        for marker in ["AES-GCM", "PBKDF2", "SHA-256", "synthetic=true", "restoreWithRollback"]:
            if marker not in text:
                errors.append(f"vault core missing required marker: {marker}")

    vault_browser = APP / "vault-browser.mjs"
    if vault_browser.is_file():
        text = vault_browser.read_text(encoding="utf-8")
        for marker in ["indexedDB", "encrypted-envelopes", "BroadcastChannel", "pagehide", "pageshow", "visibilitychange"]:
            if marker not in text:
                errors.append(f"vault browser adapter missing required lifecycle marker: {marker}")

    index = APP / "index.html"
    if index.is_file():
        text = index.read_text(encoding="utf-8")
        for marker in ["connect-src 'none'", "script-src 'self'", "worker-src 'self'", "vault-ui.mjs", "SYNTHETIC DATA ONLY"]:
            if marker not in text:
                errors.append(f"index security boundary missing: {marker}")
        if re.search(r"<script(?![^>]*\bsrc=)", text, re.I):
            errors.append("inline script is prohibited in Gate 1 index")

    service_worker = APP / "sw.js"
    if service_worker.is_file():
        text = service_worker.read_text(encoding="utf-8")
        for marker in ["aegis-synthetic-static-v2", "cache.addAll", "url.origin !== self.location.origin", "Response.error"]:
            if marker not in text:
                errors.append(f"service worker cache boundary missing: {marker}")
        if "/api/" in text or re.search(r"https?://", text):
            errors.append("service worker must not cache API paths or external URLs")

    workflow = ROOT / ".github" / "workflows" / "phase1-synthetic-coach.yml"
    if workflow.is_file():
        text = workflow.read_text(encoding="utf-8")
        if "contents: read" not in text:
            errors.append("Gate 1 workflow must be read-only")
        if not re.search(r"actions/checkout@[0-9a-f]{40}\b", text):
            errors.append("Gate 1 checkout action must be pinned to a full commit SHA")
        if "persist-credentials: false" not in text:
            errors.append("Gate 1 checkout must disable persisted credentials")
        for marker in ["vault.test.mjs", "browser-smoke.mjs", "remote-debugging-port", "Smoke-test service worker and vault lifecycle"]:
            if marker not in text:
                errors.append(f"Gate 1 workflow missing test gate: {marker}")

    forbidden_manifests = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "requirements.txt"]
    for name in forbidden_manifests:
        if (ROOT / name).exists():
            errors.append(f"unreviewed application dependency manifest: {name}")

    docs = ROOT / "docs" / "security" / "PHASE1_SYNTHETIC_COACH.md"
    if docs.is_file():
        text = docs.read_text(encoding="utf-8").lower()
        for marker in [
            "synthetic data only", "no personal data", "no deployment", "no merge", "explicit approval",
            "vault create", "corruption rollback", "service-worker cache", "not approved for personal data"
        ]:
            if marker not in text:
                errors.append(f"Gate 1 documentation missing boundary: {marker}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("AEGIS Gate 1 synthetic-coach contract passed")
    print("scope: deterministic synthetic coach plus encrypted synthetic vault; no external network or real data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
