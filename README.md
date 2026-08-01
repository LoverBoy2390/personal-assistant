# AEGIS LifeOS v0.4.1 — Mobile and Security Hardening

This repository deploys the verified AEGIS LifeOS v0.4.1 release derived from the locked v0.4.0 recovery baseline.

## Reproducible release path

GitHub Actions reconstructs the checksum-verified v0.4.0 baseline already preserved in `releases/parts/`, applies the compressed v0.4.1 patch stored in `patches/v041/`, and then verifies the resulting files against `BUILD-MANIFEST.json` before testing or deployment.

- v0.4.0 baseline SHA-256: `02dd898c768e6d4ec31aee363da32088bfb1359350b84a0902034bfe882871e1`
- v0.4.1 patch gzip SHA-256: `9c0380433d57621ad05a0148e413d0ebb58bbd0547f0a1384f0bef121c4d3678`
- Tested release ZIP SHA-256: `a97cfdd4761fc278da53ff1d6de3b4a76f8ffd5085727252456d180fc3d264c4`

## Controlled changes from v0.4.0

- Preserved the approved Home, Workspace, AEGIS, and System interface.
- Preserved the existing encrypted-vault format and compatibility.
- Added iPhone safe-area spacing, corrected four-button mobile navigation, larger touch targets, and scroll-safe dialogs.
- Added visible local-storage, cloud-sync, and build indicators.
- Added guarded storage writes, stricter backup validation, import rollback, multi-tab locking, and page-exit key clearing.
- Added a static Content Security Policy for GitHub Pages and additional local-server security headers.
- Updated the service worker to v0.4.1 with network-first navigation.
- Added regression verification and a manual mobile acceptance checklist.

## Important boundary

This is a hardened prototype, not a completed independent security audit. Vault data remains local to each browser and does not automatically sync between PC and phone. Export encrypted backups after meaningful changes.

GitHub Pages cannot run the bundled Python server, so `/api/news` remains unavailable in the hosted version and should display the existing honest fallback state.
