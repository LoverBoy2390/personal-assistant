# AEGIS v0.4.1 Security Notes

## Implemented controls
- AES-256-GCM encryption for vault contents.
- PBKDF2-SHA-256 key derivation with 250,000 iterations and a random 16-byte salt.
- Random 12-byte IV for every vault save.
- Passphrase is not stored.
- New vaults require at least 12 characters.
- Persistent-storage verification before vault creation or overwrite.
- Backup structure and Base64 field validation before import.
- Rollback if an imported backup cannot be written completely.
- Session locking when another browser tab changes the vault.
- In-memory state/key references cleared on page exit.
- Content Security Policy for both the local server and static hosted build.
- No microphone, camera, or geolocation permission in the local server policy.

## Important limits
- This is a hardened prototype, not a completed independent security audit.
- Local browser storage can still be deleted by the browser, operating system, device reset, or user action.
- GitHub Pages serves the application publicly; vault contents remain local and encrypted, but the application source is public.
- The phone and PC maintain separate vault copies unless an encrypted backup is manually transferred.
- Browser extensions, malware, a compromised operating system, or code running with equivalent local access are outside the protection boundary.
- No password recovery exists. Losing the passphrase means losing access to the vault.

## Release gate
Do not store irreplaceable secrets until encrypted export/import, wrong-passphrase handling, erase behavior, offline launch, and browser-storage deletion have been manually tested on the intended PC and phone.
