from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 8787
APP_VERSION = "0.4.1"
CACHE_SECONDS = 600
NEWS_CACHE: dict[str, object] = {"at": 0.0, "items": []}

# Public, account-free feeds. AEGIS sends no vault data to them.
DEFAULT_NEWS_FEEDS = [
    ("Google News", "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"),
    ("Spartanburg News", "https://news.google.com/rss/search?q=Spartanburg%20SC&hl=en-US&gl=US&ceid=US:en"),
    ("NPR", "https://feeds.npr.org/1001/rss.xml"),
    ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
]


def inline_script_hash() -> str:
    """Return the CSP hash for the single bundled inline application script."""
    document = (ROOT / "index.html").read_text(encoding="utf-8")
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", document, flags=re.DOTALL | re.IGNORECASE)
    if len(scripts) != 1:
        raise RuntimeError("AEGIS expects exactly one inline application script.")
    digest = hashlib.sha256(scripts[0].encode("utf-8")).digest()
    return base64.b64encode(digest).decode("ascii")


def content_security_policy() -> str:
    """Build a CSP that allows the bundled script without enabling arbitrary inline scripts."""
    return (
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        f"script-src 'self' 'sha256-{inline_script_hash()}'; "
        "img-src 'self' data: https:; "
        "connect-src 'self'; "
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com; "
        "worker-src 'self'; manifest-src 'self'; "
        "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    )


def load_news_feeds() -> list[tuple[str, str]]:
    config_path = ROOT / "news_feeds.json"
    try:
        rows = json.loads(config_path.read_text(encoding="utf-8"))
        feeds: list[tuple[str, str]] = []
        for row in rows:
            name = clean_text(str(row.get("name", "")))
            url = str(row.get("url", "")).strip()
            if name and url.startswith("https://"):
                feeds.append((name[:80], url))
        return feeds or DEFAULT_NEWS_FEEDS
    except Exception:
        return DEFAULT_NEWS_FEEDS


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.replace("\n", " ").replace("\r", " ").split())


def parse_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        text = dt.astimezone().strftime("%b %d, %I:%M %p")
        return text.replace(" 0", " ", 1).replace(", 0", ", ")
    except Exception:
        return clean_text(value)[:60]


def fetch_feed(source: str, url: str) -> list[dict[str, str]]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": f"AEGIS-LifeOS/{APP_VERSION} (+local personal feed reader)"},
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        raw = response.read(2_000_000)
    root = ET.fromstring(raw)
    items: list[dict[str, str]] = []
    nodes = root.findall(".//item")
    if not nodes:  # Basic Atom fallback
        nodes = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    for node in nodes[:20]:
        title = node.findtext("title") or node.findtext("{http://www.w3.org/2005/Atom}title")
        link = node.findtext("link")
        if not link:
            link_el = node.find("{http://www.w3.org/2005/Atom}link")
            link = link_el.attrib.get("href", "") if link_el is not None else ""
        published = (
            node.findtext("pubDate")
            or node.findtext("{http://purl.org/dc/elements/1.1/}date")
            or node.findtext("{http://www.w3.org/2005/Atom}updated")
        )
        title, link = clean_text(title), clean_text(link)
        if title and link.startswith(("http://", "https://")):
            items.append({"source": source, "title": title[:240], "link": link, "published": parse_date(published)})
    return items


def get_news(limit: int) -> dict[str, object]:
    now = time.time()
    cached = NEWS_CACHE.get("items", [])
    if cached and now - float(NEWS_CACHE.get("at", 0.0)) < CACHE_SECONDS:
        return {"fetchedAt": datetime.now(timezone.utc).isoformat(), "cached": True, "items": cached[:limit]}
    feeds = load_news_feeds()
    errors: list[str] = []
    by_source: dict[str, list[dict[str, str]]] = {}
    with ThreadPoolExecutor(max_workers=max(1, len(feeds))) as pool:
        futures = {pool.submit(fetch_feed, source, url): source for source, url in feeds}
        for future in as_completed(futures):
            source = futures[future]
            try:
                by_source[source] = future.result()
            except Exception as exc:
                errors.append(f"{source}: {type(exc).__name__}")
                by_source[source] = []
    combined: list[dict[str, str]] = []
    for index in range(12):
        for source, _ in feeds:
            rows = by_source.get(source, [])
            if index < len(rows):
                combined.append(rows[index])
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for item in combined:
        key = item["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    NEWS_CACHE["at"], NEWS_CACHE["items"] = now, unique
    return {"fetchedAt": datetime.now(timezone.utc).isoformat(), "cached": False, "errors": errors, "items": unique[:limit]}


class AegisHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[AEGIS] {self.address_string()} - {fmt % args}")

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy", content_security_policy())
        if urlparse(self.path).path in {"/", "/index.html", "/manifest.webmanifest", "/sw.js"}:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self.send_json({"ok": True, "version": APP_VERSION})
        if parsed.path == "/api/news":
            qs = parse_qs(parsed.query)
            try:
                limit = max(1, min(30, int(qs.get("limit", [12])[0])))
            except ValueError:
                limit = 12
            return self.send_json(get_news(limit))
        super().do_GET()

    def send_json(self, payload: dict[str, object], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"AEGIS LifeOS v{APP_VERSION} running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop. Public headlines are fetched only when the workspace requests them.")
    ThreadingHTTPServer((HOST, PORT), AegisHandler).serve_forever()
