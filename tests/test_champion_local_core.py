from __future__ import annotations

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from verify_champion_local_core import verify  # noqa: E402


class ChampionLocalCoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        destination = self.root / "src" / "aegis-champion"
        destination.parent.mkdir(parents=True)
        shutil.copytree(REPO_ROOT / "src" / "aegis-champion", destination)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def mutate(self, filename: str, old: str, new: str) -> None:
        path = self.root / "src" / "aegis-champion" / filename
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text, f"Mutation target missing in {filename}")
        path.write_text(text.replace(old, new, 1), encoding="utf-8")

    def assert_rejected(self) -> None:
        with self.assertRaises(AssertionError):
            verify(self.root)

    def test_current_tree_passes(self) -> None:
        result = verify(self.root)
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["external_accounts"], 0)
        self.assertEqual(result["paid_services"], 0)
        self.assertEqual(result["launcher_runtime"], "Windows PowerShell")
        self.assertFalse(result["python_required"])
        self.assertFalse(result["administrator_required"])
        self.assertFalse(result["personal_data_approved"])

    def test_rejects_network_permission(self) -> None:
        self.mutate("index.html", "connect-src 'none'", "connect-src https:")
        self.assert_rejected()

    def test_rejects_remote_runtime_url(self) -> None:
        self.mutate("champion.mjs", "window.__AEGIS_CHAMPION_READY__ = true;", "fetch('https://example.com');")
        self.assert_rejected()

    def test_rejects_paid_service_status(self) -> None:
        self.mutate("champion.mjs", "$0 enabled", "$10 enabled")
        self.assert_rejected()

    def test_rejects_cloud_sync_enablement(self) -> None:
        self.mutate("champion.mjs", "<strong class=\"safe\">Off</strong>", "<strong class=\"safe\">On</strong>")
        self.assert_rejected()

    def test_rejects_wildcard_windows_bind(self) -> None:
        self.mutate("aegis-local-server.ps1", "System.Net.IPAddress]::Loopback", "System.Net.IPAddress]::Any")
        self.assert_rejected()

    def test_rejects_python_launcher_dependency(self) -> None:
        self.mutate(
            "START_AEGIS_CHAMPION.bat",
            "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass",
            "py -m http.server 8765",
        )
        self.assert_rejected()

    def test_rejects_broadened_http_methods(self) -> None:
        self.mutate("aegis-local-server.ps1", "^(GET|HEAD)", "^(GET|HEAD|POST)")
        self.assert_rejected()

    def test_rejects_removed_path_guard(self) -> None:
        self.mutate("aegis-local-server.ps1", "StartsWith($rootPrefix", "EndsWith($rootPrefix")
        self.assert_rejected()

    def test_rejects_admin_requirement(self) -> None:
        self.mutate("aegis-local-server.ps1", "administratorRequired = $false", "administratorRequired = $true")
        self.assert_rejected()

    def test_rejects_aws_sdk(self) -> None:
        self.mutate("champion.mjs", "window.__AEGIS_CHAMPION_READY__ = true;", "const sdk = '@aws-sdk/client-s3';")
        self.assert_rejected()

    def test_rejects_embedded_personal_name(self) -> None:
        self.mutate("champion.mjs", "Good morning, Champion.", "Good morning, Deshawn.")
        self.assert_rejected()

    def test_rejects_api_cache_route(self) -> None:
        self.mutate("sw.js", "'./sw.js',", "'./sw.js', './api/private',")
        self.assert_rejected()

    def test_rejects_browser_only_manifest(self) -> None:
        self.mutate("manifest.webmanifest", '"display": "standalone"', '"display": "browser"')
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
