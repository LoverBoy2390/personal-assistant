#!/usr/bin/env python3
"""Verify the provider-neutral AEGIS Gate 2A security-kernel boundary."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "aegis-protected-backend"
REQUIRED = [
    APP / "security-core.mjs",
    APP / "server.mjs",
    APP / "README.md",
    ROOT / "tests" / "protected-backend.test.mjs",
    ROOT / "tests" / "backend-http-smoke.test.mjs",
    ROOT / "docs" / "security" / "GATE2_PROTECTED_BACKEND.md",
    ROOT / "docs" / "security" / "GATE2_KEY_HIERARCHY.md",
    ROOT / "docs" / "security" / "GATE2_INCIDENT_RESPONSE.md",
    ROOT / "docs" / "security" / "GATE2_EXTERNAL_DEPENDENCIES.md",
    ROOT / ".github" / "workflows" / "gate2-protected-backend.yml",
]
RUNTIME = [APP / "security-core.mjs", APP / "server.mjs"]
FORBIDDEN_RUNTIME = {
    "outbound fetch": re.compile(r"\bfetch\s*\("),
    "XMLHttpRequest": re.compile(r"\bXMLHttpRequest\b"),
    "WebSocket": re.compile(r"\bWebSocket\b"),
    "EventSource": re.compile(r"\bEventSource\b"),
    "child process": re.compile(r"node:child_process|\bexecFile?\s*\(|\bspawn\s*\("),
    "environment secret read": re.compile(r"process\.env\.(?:.*SECRET|.*TOKEN|.*KEY|.*PASSWORD)", re.I),
}
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{30,}\b"),
    "assigned secret": re.compile(r"(?i)\b(?:client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|password)\b\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
}


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED:
        if not path.is_file():
            errors.append(f"missing Gate 2A file: {path.relative_to(ROOT)}")

    for path in RUNTIME:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for label, pattern in FORBIDDEN_RUNTIME.items():
            if pattern.search(text):
                errors.append(f"prohibited runtime capability ({label}) in {path.relative_to(ROOT)}")
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"possible {label} in {path.relative_to(ROOT)}")

    core = APP / "security-core.mjs"
    if core.is_file():
        text = core.read_text(encoding="utf-8")
        for marker in [
            "SyntheticIdentityAdapter", "syntheticIdentityEnabled", "accessTtlMs = 120000",
            "Refresh token replay detected", "Device is revoked", "Cross-user access denied",
            "AES-GCM", "aegis-dek-wrap/v1", "purpose: 'token'", "TamperEvidentAuditLog",
            "account.deleted", "transportAllowed"
        ]:
            if marker not in text:
                errors.append(f"security core missing contract marker: {marker}")

    server = APP / "server.mjs"
    if server.is_file():
        text = server.read_text(encoding="utf-8")
        for marker in [
            "MAX_BODY_BYTES", "Cache-Control", "Secure transport required", "Bearer access token required",
            "AEGIS_SYNTHETIC_TEST_MODE", "Synthetic test server may bind only to loopback", "connectors: 0"
        ]:
            if marker not in text:
                errors.append(f"server missing boundary marker: {marker}")
        if "0.0.0.0" in text:
            errors.append("synthetic server must not contain a wildcard bind")

    workflow = ROOT / ".github" / "workflows" / "gate2-protected-backend.yml"
    if workflow.is_file():
        text = workflow.read_text(encoding="utf-8")
        if "contents: read" not in text:
            errors.append("Gate 2A workflow must be read-only")
        if not re.search(r"actions/checkout@[0-9a-f]{40}\b", text):
            errors.append("Gate 2A checkout must be pinned to a full commit SHA")
        if "persist-credentials: false" not in text:
            errors.append("Gate 2A checkout must disable persisted credentials")
        for marker in ["verify_gate2.py", "protected-backend.test.mjs", "backend-http-smoke.test.mjs"]:
            if marker not in text:
                errors.append(f"Gate 2A workflow missing test gate: {marker}")

    for name in ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "requirements.txt"]:
        if (ROOT / name).exists():
            errors.append(f"unreviewed dependency manifest: {name}")

    docs = ROOT / "docs" / "security" / "GATE2_PROTECTED_BACKEND.md"
    if docs.is_file():
        text = docs.read_text(encoding="utf-8").lower()
        for marker in [
            "synthetic data only", "connectors: none", "no connector is authorized",
            "not a passkey", "managed kms", "deployed: no", "production-ready: no",
            "explicit approval"
        ]:
            if marker not in text:
                errors.append(f"Gate 2A documentation missing boundary: {marker}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("AEGIS Gate 2A protected-backend contract passed")
    print("scope: synthetic identity adapter, provider-neutral security kernel, loopback tests, zero connectors")
    return 0


if __name__ == "__main__":
    sys.exit(main())
