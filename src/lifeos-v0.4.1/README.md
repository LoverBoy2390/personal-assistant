# AEGIS LifeOS v0.4.1 — Mobile and Security Hardening

This controlled update preserves the approved v0.4 interface and encrypted-vault format while making the installed phone experience safer and easier to use.

## Start
- Windows app-style window: `START_AEGIS_APP_MODE.bat`
- Normal browser: `START_AEGIS.bat`
- Phone: open the deployed HTTPS address in Safari, then use **Share → Add to Home Screen**.

## Added in v0.4.1
- iPhone safe-area spacing and corrected four-button mobile navigation
- Larger touch targets, 16px mobile form fields, scroll-safe modals, and narrower card layouts
- Visible storage location, cloud-sync state, and build number
- Vault creation and saving stop safely when persistent browser storage is unavailable
- Stricter encrypted-backup structure validation and write rollback on failed import
- Automatic locking when another tab changes the vault
- Page-exit removal of the in-memory session key
- Static Content Security Policy for hosted/PWA use
- Updated service-worker cache and network-first navigation
- Additional server security headers and no-cache rules for update-sensitive files
- Automated build verification script and mobile acceptance checklist

## Security boundary
- Vault contents remain AES-256-GCM encrypted with a PBKDF2-SHA-256 derived key.
- The passphrase is never stored and cannot be recovered.
- New vaults require at least 12 characters. Existing v0.4 vaults and passphrases remain compatible.
- Browser storage is not cloud synchronization or a backup. Export an encrypted backup after meaningful changes.
- GitHub Pages cannot run `server.py`; public RSS news remains unavailable there and should show the existing fallback state.

## Not live
Calendar, Gmail, finances, health providers, social-account reading, remote AI, smart-home control, and wearable pairing remain disconnected unless a real provider integration is built and verified.
