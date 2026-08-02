# AEGIS LifeOS v0.4 Privacy Model

## Default state

- Private AEGIS data is stored in an encrypted browser vault.
- No analytics, telemetry, advertising SDK, or remote logging is included.
- No social, YouTube, Gmail, Calendar, financial, health, or glasses account is connected.
- A permission toggle only records whether a future verified connection would be allowed to use that category.

## Workspace behavior

- Official-site launch tiles open the provider's own website in a separate browser tab.
- Launching a site does not give AEGIS access to the account, session, messages, feed, history, or credentials.
- Custom app names, URLs, notes, and selections are stored inside the encrypted vault.
- Specific YouTube videos and playlists can be displayed through YouTube's supported embedded player.

## Current-events service

- `server.py` fetches public RSS headlines only when the Current Events panel requests them.
- The request contains no vault data, profile information, task data, or personal identifiers from AEGIS.
- Headlines are cached in server memory for ten minutes and are not written to disk.
- Feed failures are shown as failures; AEGIS does not invent replacement stories.

## Known limits

- Data is exposed to the browser process while the vault is unlocked.
- A compromised computer, browser extension, or operating system can undermine browser-level protections.
- External websites operate under their own privacy and security policies.
- This release has not received an independent security audit or penetration test.
- The local encrypted vault is not a substitute for hardware-backed key storage.
