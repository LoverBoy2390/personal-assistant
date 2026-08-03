#!/usr/bin/env python3
"""Static release-boundary verifier for AEGIS Champion Local Core."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REQUIRED_FILES = (
    "index.html",
    "champion.css",
    "champion.mjs",
    "manifest.webmanifest",
    "icon.svg",
    "sw.js",
    "START_AEGIS_CHAMPION.bat",
    "README.md",
)

RUNTIME_FILES = (
    "index.html",
    "champion.css",
    "champion.mjs",
    "manifest.webmanifest",
    "icon.svg",
    "sw.js",
    "START_AEGIS_CHAMPION.bat",
)

BANNED_RUNTIME_PATTERNS = {
    "remote URL": re.compile(r"https?://", re.IGNORECASE),
    "AWS endpoint": re.compile(r"amazonaws\.com", re.IGNORECASE),
    "AWS SDK": re.compile(r"aws[-_ ]?sdk|@aws-sdk", re.IGNORECASE),
    "WebSocket": re.compile(r"\bWebSocket\b"),
    "EventSource": re.compile(r"\bEventSource\b"),
    "XMLHttpRequest": re.compile(r"\bXMLHttpRequest\b"),
    "sendBeacon": re.compile(r"\bsendBeacon\b"),
    "runtime fetch": re.compile(r"\bfetch\s*\("),
    "AWS create operation": re.compile(
        r"Create(Stack|Organization|Account|UserPool|Key|Bucket)|RunInstances|CreateDBCluster",
        re.IGNORECASE,
    ),
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def verify(repo_root: Path | str | None = None) -> dict[str, object]:
    root = Path(repo_root) if repo_root is not None else Path(__file__).resolve().parents[1]
    app = root / "src" / "aegis-champion"
    require(app.is_dir(), f"Champion directory missing: {app}")

    missing = [name for name in REQUIRED_FILES if not (app / name).is_file()]
    require(not missing, f"Missing Champion files: {missing}")

    files = {name: read_text(app / name) for name in REQUIRED_FILES}
    html = files["index.html"]
    js = files["champion.mjs"]
    sw = files["sw.js"]
    launcher = files["START_AEGIS_CHAMPION.bat"]
    manifest = json.loads(files["manifest.webmanifest"])

    require(manifest.get("name") == "AEGIS Champion Local Core", "Unexpected manifest name")
    require(manifest.get("short_name") == "AEGIS Champion", "Unexpected manifest short name")
    require(manifest.get("start_url") == "./", "Manifest start_url must remain local")
    require(manifest.get("scope") == "./", "Manifest scope must remain local")
    require(manifest.get("display") == "standalone", "Champion must remain installable")
    require(manifest.get("theme_color") == "#07101f", "Aurora Frost theme color changed")

    require("connect-src 'none'" in html, "CSP must block all runtime connections")
    require("frame-ancestors 'none'" in html, "CSP must block embedding")
    require("LOCAL-ONLY · SYNTHETIC DATA" in html, "Synthetic-only boundary is not visible")
    require("0 connected accounts · $0 services" in html, "Zero-account/zero-service status missing")
    require("AEGIS Champion" in html and "AEGIS Champion" in js, "Champion identity missing")
    require("$0 enabled" in js, "Paid-service status must remain visibly zero")
    require("Cloud synchronization" in js and ">Off<" in js, "Cloud synchronization must remain off")
    require("not approved for real personal" in js, "Personal-data prohibition is not visible")
    require("No AWS runtime" in js, "AWS prohibition is not visible")
    require("No consequential actions" in js, "Consequential-action prohibition is not visible")

    require("aegis-champion-local-v1" in sw, "Unexpected Champion cache identity")
    require("manifest.webmanifest" in sw and "icon.svg" in sw, "Install assets missing from offline cache")
    require("/api/" not in sw, "Champion service worker must not cache API routes")
    require("Response.error()" in sw, "Cache miss must fail closed")

    require("--bind 127.0.0.1" in launcher, "Windows launcher must bind to loopback only")
    require("--bind 0.0.0.0" not in launcher, "Wildcard launcher bind is prohibited")
    require("START_AEGIS_CHAMPION" not in launcher, "Launcher must not recursively invoke itself")

    runtime_text = "\n".join(files[name] for name in RUNTIME_FILES)
    for label, pattern in BANNED_RUNTIME_PATTERNS.items():
        match = pattern.search(runtime_text)
        require(match is None, f"Banned {label} found: {match.group(0) if match else ''}")

    require("Deshawn" not in runtime_text, "Personal name must not be embedded in runtime")
    require(not re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", runtime_text, re.IGNORECASE), "Email address embedded in runtime")
    require(not re.search(r"\b\d{12}\b", runtime_text), "Possible AWS account identifier embedded in runtime")

    return {
        "status": "passed",
        "required_files": len(REQUIRED_FILES),
        "runtime_files_checked": len(RUNTIME_FILES),
        "external_accounts": 0,
        "paid_services": 0,
        "network_policy": "connect-src none",
        "personal_data_approved": False,
    }


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
    try:
        result = verify(root)
    except (AssertionError, json.JSONDecodeError, OSError) as error:
        print(f"Champion verification failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
