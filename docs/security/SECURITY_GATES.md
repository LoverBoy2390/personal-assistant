# AEGIS LifeOS Security Gates

Status: Phase 0 review criteria  
Baseline: `53130370293be2f419ab266aeaeac5570e964989`

AEGIS advances only when the preceding gate has evidence. A document or ZIP alone does not make a capability built, tested, installed, deployed, connected, secure, or production-ready.

## Gate 0 — Baseline integrity

Required:

- Reconstruct v0.4.0 and apply the locked v0.4.1 patch.
- Verify archive, patch, file byte counts, and SHA-256 values.
- Normalize the exact source into `src/lifeos-v0.4.1`.
- Preserve the accepted interface and behavior.
- Use synthetic data only.
- Complete threat model, data flow, residual risks, and verification report.
- Pass secret/path/security-contract checks.
- No personal data, provider credentials, merge, deployment, or publication.

Evidence:

- CI logs.
- Commit hashes.
- `BUILD-MANIFEST.json` results.
- Draft PR file list and checks.

Exit decision: explicit approval required.

## Gate 1 — Synthetic functional coach

Required:

- Working vault create, lock, unlock, reset, backup, restore, and corruption rollback.
- Synthetic timeline, calendar, tasks, goals, spending, sleep, and wellness fixtures.
- Daily briefing and one prioritized next action.
- Evidence references, observation time, confidence, uncertainty, and correction controls.
- Permission, connector-status, audit, retention, export, and deletion interfaces.
- Honest labels: sandbox, disconnected, connected, stale, incomplete, estimated, or inferred.

Tests:

- Unit and browser tests.
- Lock timeout, page-exit, multi-tab, and back-forward-cache tests.
- Backup corruption and rollback tests, including independent metadata restoration.
- Service-worker cache inspection.
- No unexpected network egress.
- No real personal data.

Exit decision: explicit approval required.

## Gate 2 — Identity and protected backend

Required:

- Passkey or hardened OIDC identity.
- Device enrollment and revocation.
- Short-lived sessions and refresh rotation.
- Protected API with server-side authorization.
- Encrypted user-data store and separate encrypted token vault.
- Managed key service and documented key hierarchy.
- Tamper-evident audit events.
- Retention, export, deletion, backup, recovery, incident response, and key rotation.

Tests:

- Authentication and authorization matrix.
- Cross-user isolation.
- Session theft/replay resistance.
- Token rotation and revocation.
- Encryption in transit and at rest.
- Backup restore and permanent deletion.
- Static analysis, dependency review, secret scanning, and dynamic testing.

No connector is authorized by this gate.

Exit decision: explicit approval required.

## Gate 3 — One sandboxed read-only connector

Required:

- One low-risk source only.
- Synthetic or provider sandbox account.
- Narrow scopes, fields, date range, frequency, and retention.
- Complete connect, inspect, access-history, revoke, and delete lifecycle.
- Bounded queries and failure handling.
- No write capability.

Tests:

- OAuth state, nonce, PKCE, redirect, expiration, and revocation.
- Scope verification.
- Token-vault isolation.
- Data minimization.
- Connector rate limits and retries.
- Zero retained provider data after deletion, subject to documented backup policy.

Exit decision: explicit approval required before real data.

## Gate 4 — Limited real calendar pilot

External dependencies:

- Registered provider application or signed native build.
- Production-like backend and key service.
- Privacy policy and consent text.
- Security review of scopes and data lifecycle.

Required:

- One user and one calendar source.
- Read-only retrieval by implementation.
- Visible last access, stored fields, retention, and revocation.
- Limited observation window.
- Post-pilot deletion test.

Exit decision: explicit approval required for expansion.

## Gate 5 — Gmail read-only

Gmail is blocked until calendar lifecycle and deletion are stable. Separate threat modeling, scopes, retention, content minimization, and independent review are required.

## Gate 6 — Financial access

Financial data is blocked until a separate independent security gate. No plaintext snapshot, transaction CSV, frontend token, or public repository artifact is permitted. Read-only access, minimal windows, reconciliation rules, deletion, incident response, and external security review are mandatory.

## Deferred high-sensitivity sources

Health, messages, passwords, smart home, precise location, microphone, camera, and similar sources remain out of scope until separately proposed and explicitly approved.

## Release labels

Every release report must separately state:

- Proposed.
- Built.
- Tested.
- Installed.
- Deployed.
- Connected.
- Production-ready.

Unverified states must be labeled unverified. Residual risk must be visible. No system is described as zero-risk.
