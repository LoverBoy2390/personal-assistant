# AEGIS Synthetic Coach

Status: Gate 1 review prototype  
Mode: synthetic data only  
Deployment: none

This directory contains a deterministic AEGIS coaching sandbox and encrypted synthetic-vault lifecycle prototype. It demonstrates the intended user controls without connecting a real account or receiving personal data.

## Included

- Daily brief generated from an explicitly synthetic fixture.
- Deterministic recommendation ranking.
- Evidence, source time, confidence, inference, and unknowns for every recommendation.
- Permission controls for calendar, tasks, finance, and wellness demo domains.
- Searchable synthetic timeline and minimized session audit history.
- Recommendation correction controls.
- AES-256-GCM encrypted synthetic preferences and corrections in IndexedDB.
- PBKDF2-HMAC-SHA-256 passphrase key derivation with unique salts.
- Create, lock, unlock, delete/reset, encrypted backup, verified restore, and corruption rollback.
- Inactivity, page-exit, hidden-page, BFCache, and cross-tab locking.
- Explicit same-origin service-worker static cache.
- Responsive Aurora Frost interface and advisory-only action policy.

## Explicitly excluded

- Personal data of any kind.
- External runtime network requests or background provider jobs.
- OAuth, provider tokens, credentials, secrets, account identifiers, or passphrase recovery.
- Real email, calendar, financial, health, message, or location data.
- Autonomous or consequential actions.
- Deployment to the accepted production site.

## Local review

Serve the repository root with a local static server and open:

`/src/aegis-synthetic-coach/`

Use only synthetic information. The encrypted vault is not approved for personal data. The vault remains in the current browser until manually deleted; losing its passphrase makes it unrecoverable.
