# AEGIS LifeOS Phase 1 — Synthetic Functional Coach and Vault

Status: Gate 1 hardening under draft review  
Parent security foundation: `agent/aegis-secure-foundation-v060`  
Review branch: `agent/aegis-synthetic-coach-v061`  
Mode: synthetic data only  
Production impact: none

## Authorization boundary

Phase 1 was authorized after Phase 0 completed as a draft review package. This authorization covers updates to the existing synthetic functional-coach branch, commits, automated checks, and draft pull request #6.

The following remain prohibited without separate explicit approval:

- No personal data.
- No real account or provider connection.
- No OAuth registration, token exchange, secret, credential, backend, database, managed key service, or cloud synchronization.
- No consequential or autonomous action.
- No merge into `main`.
- No deployment or publication.

The encrypted vault in this phase is **not approved for personal data**. It exists to exercise lifecycle and recovery behavior using synthetic preferences and correction history only.

## Why the existing Phase 1 draft was hardened

The first Phase 1 draft passed a narrower synthetic-coach test contract, but the original Gate 1 security checklist also required vault create, lock, unlock, reset, encrypted backup, restore, corruption rollback, retention, deletion, browser lifecycle behavior, service-worker cache inspection, and unexpected-egress checks. The best security decision was to finish those requirements before starting Gate 2.

## Functional scope

The Gate 1 prototype demonstrates:

1. A daily brief generated from a versioned, explicitly synthetic fixture.
2. Deterministic recommendation ranking rather than opaque model output.
3. Source evidence, observed time, confidence, inference, and unknowns for every recommendation.
4. A best-next-action presentation that remains advisory-only.
5. Permission controls for four demo domains: calendar, tasks, finance, and wellness.
6. A searchable synthetic timeline.
7. A minimized session audit history.
8. Recommendation correction controls.
9. Vault create, lock, unlock, reset/delete, encrypted export, verified restore, and corruption rollback.
10. Five-minute inactivity locking, page-exit locking, hidden-page locking, BFCache restore locking, and another-tab locking.
11. Versioned service-worker cache containing only reviewed static application assets.
12. Responsive Aurora Frost presentation without modifying the accepted v0.4.1 production baseline.

## Vault data flow

```text
Synthetic preferences and corrections
              |
              | explicit synthetic=true guard
              v
Canonical JSON serialization
              |
              | PBKDF2-HMAC-SHA-256, unique 128-bit salt
              | default 310,000 iterations
              v
256-bit AES-GCM key
              |
              | unique 96-bit IV and authenticated envelope metadata
              v
Encrypted envelope only
              |
              +--> IndexedDB isolated store
              +--> encrypted JSON backup with SHA-256 transport checksum
```

The passphrase and decrypted payload remain in memory only while the vault is unlocked. A lock clears both references. The application has no passphrase recovery service.

## Restore and corruption rollback

1. The backup wrapper and envelope schemas are validated.
2. The SHA-256 checksum is verified.
3. AES-GCM authentication and passphrase unlock are verified.
4. The decrypted payload must retain `synthetic: true`.
5. Only then may the restored envelope replace the active encrypted envelope.
6. Any failure preserves the current encrypted envelope as the rollback state.

## Browser and network boundary

- Application CSP includes `connect-src 'none'`.
- Runtime application modules contain no `fetch()`, XMLHttpRequest, WebSocket, EventSource, beacon, cookie, localStorage, sessionStorage, or browser-credential use.
- IndexedDB and BroadcastChannel are isolated to the encrypted vault browser adapter.
- The service worker caches an explicit same-origin static allowlist and has no network fallback.
- No API path or external URL is included in the cache list.
- GitHub Actions launches a headless Chromium-compatible browser, records network requests through the DevTools protocol, and fails if an external request occurs.

## Verification matrix

| Check | Method |
|---|---|
| Reject non-synthetic coaching input | Existing Node test |
| Deterministic coaching output | Existing Node test |
| Priority, permission, evidence, timeline, audit behavior | Existing Node tests |
| Reject non-synthetic vault payload | Vault Node test |
| AES-GCM encrypted round trip | Vault Node test |
| Wrong-passphrase rejection | Vault Node test |
| Salt and IV rotation on update | Vault Node test |
| Encrypted backup checksum and restore | Vault Node test |
| Corruption rollback preserves current envelope | Vault Node test |
| Inactivity timeout | Vault Node test |
| Page-exit, hidden-page, BFCache, and cross-tab lock mapping | Unit and browser tests |
| Encrypted IndexedDB content contains no synthetic payload labels | Browser test |
| Service-worker cache allowlist | Static verifier and browser inspection |
| No external browser requests | DevTools network inspection |
| No prohibited runtime APIs | Python static verifier |
| Read-only pinned CI | Python workflow verifier |
| JavaScript syntax | `node --check` |

## Retention, export, and deletion

- Retention policy: encrypted synthetic preferences and corrections remain in the current browser until manual deletion.
- Export: the user can download an encrypted, checksummed backup.
- Restore: replacement occurs only after checksum and authenticated decryption pass.
- Delete: removes the active encrypted envelope from IndexedDB and clears decrypted memory.
- Service-worker static assets are separate from vault data and contain no synthetic payload, correction, credential, or token.

## Limitations and residual risk

- PBKDF2 is intentionally available through native WebCrypto, but passphrase strength still controls resistance to offline guessing.
- Browser extensions, compromised devices, malicious browser builds, and same-origin script compromise can expose data while unlocked.
- Static checks can miss obfuscated or novel unsafe behavior.
- A successful browser test does not prove every browser, operating system, lifecycle edge case, or assistive technology behaves identically.
- The service worker stores public application code only; it is not an offline data synchronization system.
- This is not an identity provider, protected backend, token vault, production database, managed key service, provider connector, or independent security audit.
- Nothing here validates real finance, health, email, calendar, message, or location data.
- The current build remains synthetic-only and is not approved for personal data.

## Completion and next gate

Gate 1 is review-complete only when the existing coaching tests, new vault tests, static boundary verifier, real browser lifecycle test, service-worker cache inspection, and external-egress check all pass on the current draft PR head. Changed-file scope must remain limited to the synthetic coach and its review materials.

Keep PR #6 draft. No merge and no deployment are authorized. Gate 2 identity and protected-backend work requires separate explicit approval after Gate 1 evidence is reviewed.
