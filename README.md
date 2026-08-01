# AEGIS LifeOS v0.4 — Working Baseline

This repository preserves and deploys the verified **AEGIS LifeOS v0.4.0** baseline that runs locally on port `8787`.

## Authoritative recovered source

The exact working archive is stored as Base64 text chunks in:

`releases/parts/`

GitHub Actions joins those chunks in filename order, decodes the original ZIP, and verifies this SHA-256 checksum before testing or deployment:

`02dd898c768e6d4ec31aee363da32088bfb1359350b84a0902034bfe882871e1`

The chunked representation is intentional. It preserves the recovered ZIP byte-for-byte while avoiding binary corruption through the connected publishing interface.

## Verified baseline identity

- Product: AEGIS LifeOS
- Version: `0.4.0`
- Approved interface includes the Home, Workspace, AEGIS, and System surfaces.
- System includes Permission Center, Connection Center, local vault controls, audit history, profile settings, and encrypted backup import/export.

## Validation completed

- ZIP integrity passes.
- The app identifies itself as AEGIS LifeOS v0.4 / 0.4.0.
- Permission Center and Connection Center are present.
- The bundled JavaScript parses successfully.
- `server.py` compiles and serves `/api/health` as `{ "ok": true, "version": "0.4.0" }`.
- `index.html`, `manifest.webmanifest`, `icon.svg`, and `sw.js` return HTTP 200 locally.
- The local server emits its intended Content-Security-Policy and other security headers.

## Run locally on Windows

1. Download the reconstructed ZIP from the workflow artifact or use the original recovery ZIP.
2. Extract it.
3. Run `START_AEGIS_APP_MODE.bat` for an app-style window, or `START_AEGIS.bat` for a normal browser window.
4. Use the same vault passphrase as earlier releases when importing an existing encrypted backup.

## Open on iPhone

The GitHub Pages workflow publishes only the static LifeOS application files over HTTPS.

1. Open the deployed Pages address in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

## Hosted-preview limits

GitHub Pages cannot run the included Python server. The static LifeOS interface, encrypted browser vault, workspace, permissions, backup/import, and PWA shell can run there. The `/api/news` endpoint cannot run on Pages, so the existing interface will display its honest unavailable/fallback state.

Vault data remains local to each browser and device. It does not automatically synchronize from PC to iPhone. Export an encrypted backup on the PC and intentionally import it on the phone when needed.

## Restoration boundary

The earlier Dashboard RC1.2 was a separate application and is not the approved LifeOS baseline. This repository now treats **AEGIS LifeOS v0.4.0** as the locked recovery baseline for controlled future development.
