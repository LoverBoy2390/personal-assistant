from __future__ import annotations

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
from verify_champion_local_core import verify  # noqa: E402


class BioCoreHeartTests(unittest.TestCase):
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
        self.assertEqual(result["experience"], "organ-gateway")
        self.assertEqual(result["version"], "1.0.0")
        self.assertEqual(result["organ"], "heart")
        self.assertEqual(result["visual_amplification"], 100)
        self.assertEqual(result["network_policy"], "pages none; exact canonical sw.js self")
        self.assertEqual(result["service_worker_scope"], "exact canonical sw.js only")
        self.assertTrue(result["simulated_data"])
        self.assertFalse(result["personal_data_approved"])

    def test_rejects_network_permission(self):
        self.mutate("index.html", "connect-src 'none'", "connect-src https:")
        self.assert_rejected()

    def test_rejects_remote_runtime_url(self):
        self.mutate("champion.mjs", "window.__AEGIS_CHAMPION_READY__ = true;", "fetch('https://example.com');")
        self.assert_rejected()

    def test_rejects_new_browser_tab(self):
        self.mutate("champion.mjs", "window.__AEGIS_CHAMPION_READY__ = true;", "window.open('about:blank');")
        self.assert_rejected()

    def test_rejects_paid_service_status(self):
        self.mutate("champion.mjs", "paidServices: 0", "paidServices: 10")
        self.assert_rejected()

    def test_rejects_cloud_sync_enablement(self):
        self.mutate("ui-utils.mjs", '<strong class="safe">Off</strong>', '<strong class="safe">On</strong>')
        self.assert_rejected()

    def test_rejects_wildcard_windows_bind(self):
        self.mutate("aegis-local-server.ps1", "System.Net.IPAddress]::Loopback", "System.Net.IPAddress]::Any")
        self.assert_rejected()

    def test_rejects_python_launcher_dependency(self):
        self.mutate("START_AEGIS_CHAMPION.bat", "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass", "py -m http.server 8765")
        self.assert_rejected()

    def test_rejects_broadened_http_methods(self):
        self.mutate("aegis-local-server.ps1", "^(GET|HEAD)", "^(GET|HEAD|POST)")
        self.assert_rejected()

    def test_rejects_removed_path_guard(self):
        self.mutate("aegis-local-server.ps1", "StartsWith($rootPrefix", "EndsWith($rootPrefix")
        self.assert_rejected()

    def test_rejects_admin_requirement(self):
        self.mutate("aegis-local-server.ps1", "administratorRequired = $false", "administratorRequired = $true")
        self.assert_rejected()

    def test_rejects_broadened_server_page_policy(self):
        self.mutate("aegis-local-server.ps1", "connect-src 'none'", "connect-src 'self'")
        self.assert_rejected()

    def test_rejects_missing_worker_same_origin_policy(self):
        self.mutate("aegis-local-server.ps1", "connect-src 'self'", "connect-src 'none'")
        self.assert_rejected()

    def test_rejects_remote_worker_permission(self):
        self.mutate("aegis-local-server.ps1", "connect-src 'self'", "connect-src https:")
        self.assert_rejected()

    def test_rejects_broadened_worker_scope(self):
        self.mutate(
            "aegis-local-server.ps1",
            "[System.String]::Equals($filePath, $serviceWorkerPath, $PathComparison)",
            "$filePath.EndsWith('sw.js')",
        )
        self.assert_rejected()

    def test_rejects_aws_sdk(self):
        self.mutate("champion.mjs", "window.__AEGIS_CHAMPION_READY__ = true;", "const sdk = '@aws-sdk/client-s3';")
        self.assert_rejected()

    def test_rejects_embedded_personal_name(self):
        self.mutate("biocore-heart.mjs", "Your system pulse.", "Deshawn's system pulse.")
        self.assert_rejected()

    def test_rejects_api_cache_route(self):
        self.mutate("sw.js", "'./sw.js',", "'./sw.js', './api/private',")
        self.assert_rejected()

    def test_rejects_missing_inline_heart_asset(self):
        self.mutate("heart-graphic.mjs", "heart-body", "static-body")
        self.assert_rejected()

    def test_rejects_browser_only_manifest(self):
        self.mutate("manifest.webmanifest", '"display": "standalone"', '"display": "browser"')
        self.assert_rejected()

    def test_rejects_missing_heart_gateway(self):
        self.mutate("biocore-heart.mjs", "THE CORE ENGINE", "GENERAL DASHBOARD")
        self.assert_rejected()

    def test_rejects_missing_vital_core(self):
        self.mutate("biocore-heart.mjs", "Your system pulse.", "General system details.")
        self.assert_rejected()

    def test_rejects_missing_amplification_disclosure(self):
        self.mutate("biocore-heart.mjs", "Visual amplification active", "Animation active")
        self.assert_rejected()

    def test_rejects_wrong_amplification_factor(self):
        self.mutate("champion.mjs", "visualAmplification: 100", "visualAmplification: 1")
        self.assert_rejected()

    def test_rejects_removed_heart_beat(self):
        self.mutate("biocore-motion.css", "@keyframes heartBeat", "@keyframes staticHeart")
        self.assert_rejected()

    def test_rejects_removed_electrical_surge(self):
        self.mutate("biocore-motion.css", "@keyframes arcSurge", "@keyframes staticArc")
        self.assert_rejected()

    def test_rejects_removed_reduced_motion(self):
        self.mutate("biocore-responsive.css", "BIOCORE_REDUCED_MOTION_HEART", "BIOCORE_MOTION_ALWAYS_ON")
        self.assert_rejected()

    def test_rejects_removed_mobile_layout(self):
        self.mutate("biocore-responsive.css", "@media (max-width: 760px)", "@media (max-width: 1px)")
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
