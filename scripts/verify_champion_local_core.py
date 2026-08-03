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
    "aegis-local-server.ps1",
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
    "aegis-local-server.ps1",
)

NETWORK_RUNTIME_FILES = (
    "index.html",
    "champion.css",
    "champion.mjs",
    "manifest.webmanifest",
    "icon.svg",
    "sw.js",
)

BANNED_RUNTIME_PATTERNS = {
    "AWS endpoint": re.compile(r"amazonaws\.com", re.IGNORECASE),
    "AWS SDK import": re.compile(
        r"@aws-sdk/|(?:from|require\()\s*['\"]aws-sdk|\bAWS\.config\b|\bnew\s+AWS\.",
        re.IGNORECASE,
    ),
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

ALLOWED_LOOPBACK_TEMPLATE = "http://127.0.0.1:$Port$AppPath"
ALLOWED_BROWSER_MARKUP_URLS = {"http://www.w3.org/2000/svg"}


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
    server = files["aegis-local-server.ps1"]
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

    launcher_lower = launcher.lower()
    require("powershell.exe" in launcher_lower, "Windows launcher must use built-in PowerShell")
    require("-noprofile" in launcher_lower, "PowerShell launcher must disable profile loading")
    require("-executionpolicy bypass" in launcher_lower, "PowerShell launcher must use process-only execution bypass")
    require("aegis-local-server.ps1" in launcher_lower, "PowerShell server script is not invoked")
    require(not re.search(r"\bpy(?:\.exe)?\b|\bpython(?:3|\.exe)?\b", launcher_lower), "Python dependency remains in Windows launcher")
    require("START_AEGIS_CHAMPION" not in launcher, "Launcher must not recursively invoke itself")

    require("System.Net.Sockets.TcpListener" in server, "Local server must use TcpListener")
    require("System.Net.IPAddress]::Loopback" in server, "Local server must bind to loopback")
    require("System.Net.IPAddress]::Any" not in server, "Wildcard IPv4 bind is prohibited")
    require("System.Net.IPAddress]::IPv6Any" not in server, "Wildcard IPv6 bind is prohibited")
    require("0.0.0.0" not in server and "::0" not in server, "Wildcard address literal is prohibited")
    require("^(GET|HEAD)" in server, "Local server must allow only GET and HEAD")
    require("GetFullPath" in server and "StartsWith($rootPrefix" in server, "Path traversal guard is missing")
    require("Path traversal rejected" in server, "Path traversal rejection is not explicit")
    require("Content-Security-Policy" in server and "connect-src 'none'" in server, "Server CSP header is missing")
    require("administratorRequired = $false" in server, "No-admin validation marker missing")
    require("pythonRequired = $false" in server, "No-Python validation marker missing")
    require("Start-Process $AppUrl" in server, "Server must open the local application URL")

    local_runtime = launcher + "\n" + server
    local_urls = set(re.findall(r"https?://[^\s\"']+", local_runtime, re.IGNORECASE))
    require(local_urls == {ALLOWED_LOOPBACK_TEMPLATE}, f"Unexpected launcher/server URL: {sorted(local_urls)}")

    runtime_text = "\n".join(files[name] for name in RUNTIME_FILES)
    network_runtime_text = "\n".join(files[name] for name in NETWORK_RUNTIME_FILES)
    browser_urls = set(re.findall(r"https?://[^\s\"'<>]+", network_runtime_text, re.IGNORECASE))
    require(browser_urls <= ALLOWED_BROWSER_MARKUP_URLS, f"Remote URL embedded in browser runtime: {sorted(browser_urls)}")
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
        "launcher_bind": "127.0.0.1",
        "launcher_runtime": "Windows PowerShell",
        "python_required": False,
        "administrator_required": False,
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
