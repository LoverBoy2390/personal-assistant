# AEGIS LifeOS v0.4 — Working Baseline

This repository preserves and deploys the verified AEGIS LifeOS v0.4.0 baseline that runs locally on port `8787`.

## Authoritative source artifact

`releases/AEGIS-LifeOS-v0.4-working-baseline.zip`

SHA-256:

`02dd898c768e6d4ec31aee363da32088bfb1359350b84a0902034bfe882871e1`

The archive is committed intact so the recovered working build is not silently rewritten during restoration.

## What was verified

- ZIP integrity passes.
- The app identifies itself as AEGIS LifeOS v0.4 / 0.4.0.
- Permission Center and Connection Center are present.
- The bundled JavaScript parses successfully.
- `server.py` compiles and serves `/api/health` as `{ "ok": true, "version": "0.4.0" }`.
- `index.html`, `manifest.webmanifest`, `icon.svg`, and `sw.js` return HTTP 200 locally.
- The local server emits its intended security headers, including Content-Security-Policy.

## Run locally on Windows

1. Download and extract the authoritative ZIP.
2. Run `START_AEGIS_APP_MODE.bat` for the app-style window, or `START_AEGIS.bat` for a normal browser window.
3. Use the same vault passphrase as earlier releases when importing an existing encrypted backup.

## Open on iPhone

The GitHub Pages workflow extracts only the static app files and publishes them over HTTPS.

1. Open the Pages address in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

### Hosted-preview limits

GitHub Pages cannot run the included Python server. The static LifeOS interface, encrypted browser vault, workspace, permissions, backup/import, and PWA shell can run there, but `/api/news` is unavailable and the app will show its existing honest fallback message.

Vault data is local to each browser and device. It does not automatically synchronize from PC to iPhone. Export an encrypted backup on PC and intentionally import it on the phone when needed.

## Restoration boundary

The earlier Dashboard RC1.2 was a different application and is not the approved LifeOS baseline. This repository now treats v0.4.0 as the recovery baseline for controlled future development.
