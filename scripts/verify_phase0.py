#!/usr/bin/env python3
"""Verify the AEGIS Phase 0 review branch without accessing personal data."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "lifeos-v0.4.1"
BASELINE_COMMIT = "53130370293be2f419ab266aeaeac5570e964989"

REQUIRED_DOCUMENTS = [
    ROOT / "docs" / "security" / "THREAT_MODEL.md",
    ROOT / "docs" / "security" / "DATA_FLOW.md",
    ROOT / "docs" / "security" / "SECURITY_GATES.md",
    ROOT / "docs" / "security" / "RESIDUAL_RISKS.md",
    ROOT / "docs" / "security" / "PHASE0_VERIFICATION.md",
    ROOT / "src" / "README.md",
]

FORBIDDEN_SUFFIXES = {
    ".env",
    ".key",
    ".pem",
    ".p12",
    ".pfx",
    ".sqlite",
    ".sqlite3",
    ".db",
}

FORBIDDEN_PATH_TERMS = (
    "financial-snapshot",
    "transaction-export",
    "health-export",
    "gmail-export",
    "calendar-export",
)

SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    "assigned client secret": re.compile(r"(?i)\bclient[_-]?secret\b\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
    "assigned refresh token": re.compile(r"(?i)\brefresh[_-]?token\b\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
    "assigned access token": re.compile(r"(?i)\baccess[_-]?token\b\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
    "assigned API key": re.compile(r"(?i)\bapi[_-]?key\b\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
}

SCAN_SUFFIXES = {
    ".md",
    ".py",
    ".yml",
    ".yaml",
    ".json",
    ".html",
    ".js",
    ".webmanifest",
    ".bat",
}

EXCLUDED_PREFIXES = (
    "releases/parts/",
    "patches/v041/",
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def verify_documents(errors: list[str]) -> None:
    for path in REQUIRED_DOCUMENTS:
        if not path.is_file():
            fail(errors, f"missing required document: {relative(path)}")

    combined = "\n".join(
        path.read_text(encoding="utf-8", errors="strict")
        for path in REQUIRED_DOCUMENTS
        if path.is_file()
    )
    for marker in [
        BASELINE_COMMIT,
        "synthetic data only",
        "no merge",
        "no deployment",
        "no personal data",
        "explicit approval",
    ]:
        if marker.lower() not in combined.lower():
            fail(errors, f"documentation is missing required boundary: {marker}")


def verify_source(errors: list[str]) -> None:
    if not SOURCE.is_dir():
        fail(errors, "normalized source is missing: src/lifeos-v0.4.1")
        return

    required = [
        "index.html",
        "manifest.webmanifest",
        "icon.svg",
        "sw.js",
        "server.py",
        "BUILD-MANIFEST.json",
        "verify_build.py",
    ]
    for name in required:
        if not (SOURCE / name).is_file():
            fail(errors, f"normalized source missing required file: {name}")

    manifest_path = SOURCE / "BUILD-MANIFEST.json"
    if not manifest_path.is_file():
        return

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        fail(errors, f"invalid BUILD-MANIFEST.json: {exc}")
        return

    if manifest.get("version") != "0.4.1":
        fail(errors, f"unexpected normalized version: {manifest.get('version')!r}")

    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        fail(errors, "BUILD-MANIFEST.json has no file map")
        return

    for name, expected in files.items():
        path = SOURCE / name
        if not path.is_file():
            fail(errors, f"manifest file missing: {name}")
            continue
        data = path.read_bytes()
        actual_hash = hashlib.sha256(data).hexdigest()
        expected_hash = expected.get("sha256")
        expected_bytes = expected.get("bytes")
        if len(data) != expected_bytes:
            fail(errors, f"byte-count mismatch: {name}")
        if actual_hash != expected_hash:
            fail(errors, f"SHA-256 mismatch: {name}")


def verify_no_sensitive_artifacts(errors: list[str]) -> None:
    for path in ROOT.rglob("*"):
        if ".git" in path.parts or not path.is_file():
            continue
        rel = relative(path)
        rel_lower = rel.lower()

        if path.is_symlink():
            fail(errors, f"symlink not allowed in Phase 0: {rel}")

        if path.suffix.lower() in FORBIDDEN_SUFFIXES or path.name.lower() == ".env":
            fail(errors, f"forbidden secret or database file: {rel}")

        if any(term in rel_lower for term in FORBIDDEN_PATH_TERMS):
            fail(errors, f"forbidden personal-data artifact path: {rel}")

        if rel.startswith(EXCLUDED_PREFIXES) or path.suffix.lower() not in SCAN_SUFFIXES:
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                fail(errors, f"possible {label} in {rel}")


def main() -> int:
    errors: list[str] = []
    verify_documents(errors)
    verify_source(errors)
    verify_no_sensitive_artifacts(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("AEGIS Phase 0 contract passed")
    print(f"baseline commit: {BASELINE_COMMIT}")
    print("scope: normalized source, synthetic-only security foundation, no deployment")
    return 0


if __name__ == "__main__":
    sys.exit(main())
