# AEGIS LifeOS Data Flow and Trust Boundaries

Status: Phase 0 architecture proposal  
Accepted baseline: `53130370293be2f419ab266aeaeac5570e964989`  
Current Phase 0 mode: synthetic data only; no personal data, connection, merge, or deployment.

## 1. Current v0.4.1 flow

```text
User
  |
  v
Static PWA / local browser
  |-- interface state
  |-- browser-local encrypted-vault prototype
  |-- encrypted backup import/export
  |-- permission and connector status screens
  |
  +--> GitHub Pages public static assets

Optional local Windows mode
  |
  +--> local Python server on loopback
       |-- static files
       +-- limited local API behavior
```

Important boundary: GitHub Pages cannot protect provider secrets, run scheduled jobs, perform token exchange, or provide automatic cross-device synchronization. The browser vault is synthetic-only until its key handling, deletion, extension/XSS exposure, and offline-guessing risks pass review.

## 2. Phase 0 reconstruction and verification flow

```text
Locked repository commit
  |
  | SHA-256 verified Base64 chunks
  v
v0.4.0 ZIP + v0.4.1 patch
  |
  | safe extraction; traversal and symlink rejection
  v
Temporary GitHub Actions workspace
  |
  | BUILD-MANIFEST byte and SHA-256 verification
  v
Reconstructed v0.4.1 source
  |
  | byte-for-byte comparison
  v
Committed src/lifeos-v0.4.1
  |
  | secret/path/security-contract and syntax checks
  v
Draft review branch and draft PR
```

The Phase 0 workflow is read-only. It reconstructs the locked release in temporary storage, compares every committed source file byte-for-byte, and has no repository-write or deployment permission.

## 3. Proposed secure operating architecture

```text
Windows client / signed iOS client / limited PWA
                 |
                 | passkey/OIDC + short-lived AEGIS session
                 v
        AEGIS backend-for-frontend
                 |
       +---------+----------+----------------+
       |                    |                |
       v                    v                v
Permission policy      Audit service     Coach service
       |                    |                |
       v                    v                v
Connector workers   Append-only events   Minimized evidence bundle
       |                                     |
       v                                     v
Provider OAuth APIs                         Rules engine
       |                                     |
       v                                     v
Encrypted token vault                 Optional model service
       |
       +--> managed KMS / hardware-backed key service

Encrypted user-data store
       |
       +--> retention, export, deletion, and recovery jobs
```

## 4. Data classes

| Class | Examples | Phase 0 | Future storage rule |
|---|---|---:|---|
| Public application | HTML, CSS, icons, synthetic fixtures | Allowed | Public repository and CDN |
| Authentication | passkey identifiers, sessions | Not created | Protected backend; short-lived sessions |
| Provider credentials | authorization codes, access/refresh tokens | Prohibited | Separate encrypted token vault only |
| Highly sensitive content | finance, health, email, messages, location | Prohibited | Minimized encrypted records after separate approval |
| Coaching evidence | source facts, timestamps, confidence | Synthetic only | Encrypted, source-referenced, retention-limited |
| Audit metadata | access type, count, time, permission change | Synthetic only | Tamper-evident; avoid raw sensitive content |
| Recovery material | encrypted backup, recovery key metadata | Synthetic only | Authenticated encryption; tested restoration and deletion |

## 5. Future connector flow

```text
1. User selects one connector.
2. AEGIS explains exact read scope, fields, date range, retention, and deletion.
3. User gives explicit approval.
4. Backend creates PKCE/state/nonce values.
5. Provider returns authorization code to protected backend.
6. Backend exchanges code; frontend never receives provider secret or refresh token.
7. Token vault encrypts token separately from user data.
8. Worker performs bounded read-only incremental retrieval.
9. Normalizer stores only required fields or summaries.
10. Coach receives a minimized evidence bundle.
11. Audit records access time, purpose, scope, counts, and result.
12. Revocation deletes tokens, scheduled jobs, cached data, and retained records as promised.
```

## 6. Recommendation flow

```text
Source records
  -> validation and freshness checks
  -> deterministic calculations
  -> fact / inference separation
  -> minimized evidence bundle
  -> recommendation generation
  -> confidence and unknowns
  -> user-visible evidence
  -> user correction or deletion
```

Every recommendation must identify the observation window and indicate stale, incomplete, estimated, or inferred information. A recommendation is not authorization to act.

## 7. Consequential-action flow

Phase 0 contains no consequential actions. Any future action must use:

```text
Suggestion
  -> visible proposed action
  -> exact target and effect
  -> reversibility and risks
  -> explicit user approval
  -> server-side authorization check
  -> execution
  -> result verification
  -> audit record
```

Financial transfers, purchases, messages, account changes, medical decisions, legal filings, and record deletion require separate design and approval. Read-only coaching remains the default.

## 8. Logging rules

Logs may contain:

- Request or job identifier.
- Connector type.
- Scope identifier.
- Start/end time, duration, status, and record count.
- Redacted error category.

Logs must not contain:

- Credentials, authorization codes, tokens, keys, passphrases, or recovery secrets.
- Email body, health record, transaction description, message content, or calendar title unless a separately approved diagnostic process requires a redacted sample.
- Complete request/response payloads from sensitive providers.

## 9. Retention and deletion flow

Each stored data type must define owner, purpose, location, encryption, retention period, backup behavior, and deletion method. Revocation is incomplete until tokens, scheduled jobs, caches, derived summaries, and retained records are handled according to the displayed policy.

## 10. Unresolved design decisions

- Identity provider and passkey implementation.
- Hosting, database, KMS, region, and backup provider.
- Exact end-to-end encryption boundary.
- Native versus web ownership of local encrypted data.
- Safe cross-device conflict resolution.
- Calendar sandbox/provider selection.
- Independent security-review provider.

No unresolved choice may be described as built, connected, tested, deployed, or production-ready.
