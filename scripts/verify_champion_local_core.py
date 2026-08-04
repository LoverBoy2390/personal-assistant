#!/usr/bin/env python3
"""Static boundary verifier for AEGIS BioCore Heart v1.0."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TEXT_FILES = (
    "index.html",
    "champion.css",
    "champion.mjs",
    "champion-shell.css",
    "biocore-base.css",
    "biocore-heart.css",
    "biocore-motion.css",
    "biocore-responsive.css",
    "heart-graphic.mjs",
    "ui-utils.mjs",
    "organ-dock.mjs",
    "biocore-heart.mjs",
    "support-views.mjs",
    "manifest.webmanifest",
    "icon.svg",
    "sw.js",
    "START_AEGIS_CHAMPION.bat",
    "aegis-local-server.ps1",
    "README.md",
)
NETWORK_RUNTIME_FILES = (
    "index.html", "champion.css", "champion.mjs", "manifest.webmanifest", "icon.svg", "sw.js"
)
BANNED_RUNTIME_PATTERNS = {
    "AWS endpoint": re.compile(r"amazonaws\.com", re.IGNORECASE),
    "AWS SDK import": re.compile(r"@aws-sdk/|(?:from|require\()\s*['\"]aws-sdk|\bAWS\.config\b|\bnew\s+AWS\.", re.IGNORECASE),
    "WebSocket": re.compile(r"\bWebSocket\b"),
    "EventSource": re.compile(r"\bEventSource\b"),
    "XMLHttpRequest": re.compile(r"\bXMLHttpRequest\b"),
    "sendBeacon": re.compile(r"\bsendBeacon\b"),
    "runtime fetch": re.compile(r"\bfetch\s*\("),
    "new browser tab": re.compile(r"\bwindow\.open\s*\(", re.IGNORECASE),
    "AWS create operation": re.compile(r"Create(Stack|Organization|Account|UserPool|Key|Bucket)|RunInstances|CreateDBCluster", re.IGNORECASE),
}
ALLOWED_LOOPBACK_TEMPLATE = "http://127.0.0.1:$Port$AppPath"
ALLOWED_BROWSER_MARKUP_URLS = {"http://www.w3.org/2000/svg"}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify(repo_root: Path | str | None = None) -> dict[str, object]:
    root = Path(repo_root) if repo_root is not None else Path(__file__).resolve().parents[1]
    app = root / "src" / "aegis-champion"
    require(app.is_dir(), f"BioCore directory missing: {app}")
    missing = [name for name in TEXT_FILES if not (app / name).is_file()]
    require(not missing, f"Missing BioCore files: {missing}")

    files = {name: (app / name).read_text(encoding="utf-8") for name in TEXT_FILES}
    html, js, sw = files["index.html"], files["champion.mjs"], files["sw.js"]
    visual_css = "\n".join(files[name] for name in ("champion.css", "champion-shell.css", "biocore-base.css", "biocore-heart.css", "biocore-motion.css", "biocore-responsive.css"))
    heart_svg = files["heart-graphic.mjs"]
    app_js = "\n".join(files[name] for name in ("champion.mjs", "ui-utils.mjs", "organ-dock.mjs", "biocore-heart.mjs", "support-views.mjs"))
    launcher, server = files["START_AEGIS_CHAMPION.bat"], files["aegis-local-server.ps1"]
    manifest = json.loads(files["manifest.webmanifest"])

    require(manifest.get("name") == "AEGIS BioCore Heart", "Unexpected manifest name")
    require(manifest.get("short_name") == "AEGIS BioCore", "Unexpected manifest short name")
    require(manifest.get("start_url") == "./" and manifest.get("scope") == "./", "Manifest must remain local")
    require(manifest.get("display") == "standalone", "BioCore must remain installable")
    require(manifest.get("theme_color") == "#110c2f", "BioCore theme color changed")

    require("connect-src 'none'" in html, "Page CSP must block runtime connections")
    require("frame-ancestors 'none'" in html, "CSP must block embedding")
    require("LOCAL-ONLY · SYNTHETIC DATA" in html, "Synthetic boundary missing")
    require("0 connected accounts · $0 services" in html, "Zero-account/zero-service status missing")
    require("<title>AEGIS BioCore Heart</title>" in html, "BioCore document identity missing")

    for marker in (
        "HEART", "THE CORE ENGINE", "Tap heart to open", "Visual amplification active",
        "window.__AEGIS_BIOCORE__", "version: '1.0.0'", "experience: 'organ-gateway'",
        "visualAmplification: 100", "simulatedData: true", "paidServices: 0",
        "navigator.vibrate", "Activated Heart Core", "data-chamber=\"vital\"", "Your system pulse.", "No AWS runtime",
        "No real accounts", "No consequential actions", "Cloud synchronization",
        '<strong class="safe">Off</strong>',
    ):
        require(marker in app_js, f"Required BioCore marker missing: {marker}")

    for marker in (
        ".biocore-shell", ".heart-trigger", ".heart-metric", ".organ-dock", ".vital-chamber",
        "@keyframes heartBeat", "@keyframes arcSurge", "@keyframes heartIdle",
        "@media (prefers-reduced-motion: reduce)", "@media (max-width: 760px)",
    ):
        require(marker in visual_css, f"Required BioCore visual marker missing: {marker}")
    require("BIOCORE_REDUCED_MOTION_HEART" in visual_css, "BioCore reduced-motion contract missing")

    require("aegis-biocore-heart-v1" in sw, "Unexpected BioCore cache identity")
    for asset in ("manifest.webmanifest", "icon.svg", "heart-graphic.mjs", "ui-utils.mjs", "organ-dock.mjs", "biocore-heart.mjs", "support-views.mjs", "champion-shell.css", "biocore-base.css", "biocore-heart.css", "biocore-motion.css", "biocore-responsive.css"):
        require(asset in sw, f"Offline cache missing {asset}")
    require("export function heartGraphic" in heart_svg and "heart-body" in heart_svg and "vein-network" in heart_svg, "Local vector heart missing")
    require("import { heartGraphic } from './heart-graphic.mjs'" in app_js, "Heart graphic import missing")
    require(".biocore-landscape::before" in visual_css and "@keyframes veinCurrent" in visual_css, "Serene vector landscape or electrical current missing")
    require("/api/" not in sw, "Service worker must not cache API routes")
    require("Response.error()" in sw, "Cache miss must fail closed")

    launcher_lower = launcher.lower()
    require("powershell.exe" in launcher_lower and "-noprofile" in launcher_lower, "Launcher must use constrained PowerShell")
    require("-executionpolicy bypass" in launcher_lower, "Launcher must use process-only bypass")
    require("aegis-local-server.ps1" in launcher_lower, "PowerShell server is not invoked")
    require(not re.search(r"\bpy(?:\.exe)?\b|\bpython(?:3|\.exe)?\b", launcher_lower), "Python dependency returned")
    require("START_AEGIS_CHAMPION" not in launcher, "Launcher recursion prohibited")

    require("System.Net.Sockets.TcpListener" in server, "Local server must use TcpListener")
    require("System.Net.IPAddress]::Loopback" in server, "Local server must bind to loopback")
    require("System.Net.IPAddress]::Any" not in server and "System.Net.IPAddress]::IPv6Any" not in server, "Wildcard bind prohibited")
    require("^(GET|HEAD)" in server, "Only GET and HEAD may be accepted")
    require("GetFullPath" in server and server.count("StartsWith($rootPrefix") == 2, "Path traversal guard missing")
    require("administratorRequired = $false" in server and "pythonRequired = $false" in server, "No-admin/no-Python markers missing")

    require('$PageCsp = "default-src \'self\'' in server and "connect-src 'none'" in server, "Page CSP declaration missing")
    require('$ServiceWorkerCsp = "default-src \'self\'' in server and "connect-src 'self'" in server, "Service-worker same-origin CSP missing")
    require('$ServiceWorkerRelativePath = "src/aegis-champion/sw.js"' in server, "Canonical service-worker path marker missing")
    require("[System.String]::Equals($filePath, $serviceWorkerPath, $PathComparison)" in server, "Service-worker CSP is not restricted to an exact canonical file match")
    require("$responseCsp = if" in server and "-ContentSecurityPolicy $responseCsp" in server, "Per-response CSP selection missing")
    require('-ContentSecurityPolicy $PageCsp' in server, "Error responses must retain the page CSP")
    require('serviceWorkerScope = "exact canonical sw.js only"' in server, "Validation output does not state the exact worker scope")
    require("connect-src https:" not in server and "connect-src *" not in server, "Server CSP permits a remote or wildcard connection source")

    local_urls = set(re.findall(r"https?://[^\s\"']+", launcher + "\n" + server, re.IGNORECASE))
    require(local_urls == {ALLOWED_LOOPBACK_TEMPLATE}, f"Unexpected local URL: {sorted(local_urls)}")

    runtime_text = "\n".join(files.values())
    network_runtime_text = "\n".join(files[name] for name in NETWORK_RUNTIME_FILES)
    browser_urls = set(re.findall(r"https?://[^\s\"'<>]+", network_runtime_text, re.IGNORECASE))
    require(browser_urls <= ALLOWED_BROWSER_MARKUP_URLS, f"Remote browser URL embedded: {sorted(browser_urls)}")
    for label, pattern in BANNED_RUNTIME_PATTERNS.items():
        match = pattern.search(runtime_text)
        require(match is None, f"Banned {label} found: {match.group(0) if match else ''}")

    require("Deshawn" not in runtime_text, "Personal name must not be embedded")
    require(not re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", runtime_text, re.IGNORECASE), "Email embedded")
    require(not re.search(r"\b\d{12}\b", runtime_text), "Possible AWS account identifier embedded")

    return {
        "status": "passed",
        "experience": "organ-gateway",
        "version": "1.0.0",
        "organ": "heart",
        "visual_amplification": 100,
        "simulated_data": True,
        "external_accounts": 0,
        "paid_services": 0,
        "network_policy": "pages none; exact canonical sw.js self",
        "service_worker_scope": "exact canonical sw.js only",
        "launcher_bind": "127.0.0.1",
        "launcher_runtime": "Windows PowerShell",
        "python_required": False,
        "administrator_required": False,
        "personal_data_approved": False,
        "motion_reduction_supported": True,
    }


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
    try:
        result = verify(root)
    except (AssertionError, json.JSONDecodeError, OSError) as error:
        print(f"BioCore verification failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
