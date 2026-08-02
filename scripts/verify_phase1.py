#!/usr/bin/env python3
"""Verify the AEGIS Phase 1 synthetic-coach boundary."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "aegis-synthetic-coach"
REQUIRED = [
    APP / "index.html",
    APP / "styles.css",
    APP / "fixtures.mjs",
    APP / "coach-engine.mjs",
    APP / "app.mjs",
    APP / "README.md",
    ROOT / "tests" / "synthetic-coach.test.mjs",
    ROOT / "docs" / "security" / "PHASE1_SYNTHETIC_COACH.md",
    ROOT / ".github" / "workflows" / "phase1-synthetic-coach.yml",
]
PROHIBITED_RUNTIME_PATTERNS = {
    "network fetch": re.compile(r"\bfetch\s*\("),
    "XMLHttpRequest": re.compile(r"\bXMLHttpRequest\b"),
    "WebSocket": re.compile(r"\bWebSocket\b"),
    "EventSource": re.compile(r"\bEventSource\b"),
    "localStorage": re.compile(r"\blocalStorage\b"),
    "sessionStorage": re.compile(r"\bsessionStorage\b"),
    "IndexedDB": re.compile(r"\bindexedDB\b", re.I),
    "browser credentials API": re.compile(r"navigator\.credentials"),
    "document cookie": re.compile(r"document\.cookie"),
}


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED:
        if not path.is_file():
            errors.append(f"missing required Phase 1 file: {path.relative_to(ROOT)}")

    fixture = APP / "fixtures.mjs"
    if fixture.is_file() and not re.search(r"\bsynthetic\s*:\s*true\b", fixture.read_text(encoding="utf-8")):
        errors.append("fixture is not explicitly marked synthetic: true")

    runtime_files = [APP / "index.html", APP / "fixtures.mjs", APP / "coach-engine.mjs", APP / "app.mjs"]
    for path in runtime_files:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for label, pattern in PROHIBITED_RUNTIME_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"prohibited Phase 1 capability ({label}) in {path.relative_to(ROOT)}")

    workflow = ROOT / ".github" / "workflows" / "phase1-synthetic-coach.yml"
    if workflow.is_file():
        text = workflow.read_text(encoding="utf-8")
        if "contents: read" not in text:
            errors.append("Phase 1 workflow must be read-only")
        if not re.search(r"actions/checkout@[0-9a-f]{40}\b", text):
            errors.append("Phase 1 checkout action must be pinned to a full commit SHA")
        if "persist-credentials: false" not in text:
            errors.append("Phase 1 checkout must disable persisted credentials")

    forbidden_manifests = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "requirements.txt"]
    for name in forbidden_manifests:
        if (ROOT / name).exists():
            errors.append(f"unreviewed application dependency manifest: {name}")

    docs = ROOT / "docs" / "security" / "PHASE1_SYNTHETIC_COACH.md"
    if docs.is_file():
        text = docs.read_text(encoding="utf-8").lower()
        for marker in ["synthetic data only", "no personal data", "no deployment", "no merge", "explicit approval"]:
            if marker not in text:
                errors.append(f"Phase 1 documentation missing boundary: {marker}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("AEGIS Phase 1 synthetic-coach contract passed")
    print("scope: deterministic synthetic coach, advisory-only, no network, no persistence")
    return 0


if __name__ == "__main__":
    sys.exit(main())
