# AEGIS LifeOS Phase 0 Threat Model

Status: proposed security baseline for review  
Date: 2026-08-02  
Accepted production baseline: `53130370293be2f419ab266aeaeac5570e964989`  
Phase 0 rule: synthetic data only; no personal data, provider connection, merge, or deployment.

## 1. Security objective

AEGIS must become a functional coach and guide without turning the public frontend, source repository, logs, backups, or browser storage into a collection point for credentials or sensitive life data. Consequential actions always require explicit approval. Phase 0 does not authorize automatic messages, purchases, financial actions, record changes, or account modification.

## 2. Scope

In scope for Phase 0:

- Exact reconstruction and normalization of AEGIS LifeOS v0.4.1.
- Synthetic-data coach demonstrations.
- Local vault behavior using synthetic records only.
- Permission, connector-status, audit, and evidence interfaces.
- Security architecture, tests, source provenance, and release verification.

Out of scope:

- Real Gmail, Calendar, financial, health, message, password, smart-home, or account data.
- OAuth applications, provider tokens, refresh tokens, API secrets, or encryption keys.
- Production backend, production database, cloud key management, native signing, TestFlight, merge, publication, or deployment.
- Claims that the product is connected, synchronized, production-ready, independently audited, or secure against every threat.

## 3. Protected assets

1. User identity and authentication factors.
2. Provider authorization codes, access tokens, and refresh tokens.
3. Encryption keys, recovery material, and passphrases.
4. Calendar, email, financial, health, location, family, message, and personal timeline data.
5. Recommendations, evidence bundles, confidence labels, and user corrections.
6. Permission decisions, revocation state, deletion state, and audit records.
7. Software supply chain, accepted visual baseline, source provenance, and release integrity.
8. Availability of the coach without silently degrading security controls.

## 4. Trust boundaries

- Public GitHub repository boundary.
- GitHub Actions runner boundary.
- Public GitHub Pages frontend boundary.
- Browser or PWA runtime boundary.
- Native operating-system secure-storage boundary.
- Future AEGIS backend boundary.
- Future provider OAuth boundary.
- Future encrypted database and token-vault boundary.
- Future language-model or analysis-service boundary.
- User approval boundary for consequential actions.

Data crossing a boundary must have an identified source, purpose, scope, retention period, encryption state, and deletion method.

## 5. Threat actors

- Opportunistic internet attackers.
- Credential-stuffing and phishing attackers.
- Malicious or compromised browser extensions.
- Supply-chain attackers affecting dependencies or CI actions.
- A compromised frontend through cross-site scripting.
- A compromised backend service or cloud credential.
- Another person with access to an unlocked device.
- An overprivileged connector or defective permission implementation.
- A developer or operator accidentally logging or committing sensitive data.
- A language model producing unsupported claims or unsafe recommendations.
- The legitimate user acting under fatigue or misunderstanding an approval prompt.

## 6. Primary threats and controls

### Spoofing

Threats:

- Session theft, phishing, forged device identity, or provider callback substitution.

Required future controls:

- Passkeys or hardened OIDC.
- Authorization Code flow with PKCE.
- Exact redirect URI validation.
- Short-lived sessions, rotation, device registration, and immediate revocation.
- No provider credentials in frontend JavaScript or public URLs.

Phase 0 control:

- No real authentication or provider connection is created.

### Tampering

Threats:

- Modified release archives, malicious backup imports, altered audit entries, or manipulated recommendation evidence.

Current and Phase 0 controls:

- Locked baseline commit.
- Archive and patch SHA-256 checks.
- Exact `BUILD-MANIFEST.json` verification.
- Safe ZIP extraction that rejects traversal and symbolic links.
- Normalized source committed only after hash verification.
- Backup validation and rollback tests remain required.

Future controls:

- Signed releases, tamper-evident audit records, authenticated encryption, versioned schemas, and verified migration rollback.

### Repudiation

Threats:

- Unclear permission history, missing evidence for recommendations, or inability to determine whether an action was requested.

Required controls:

- Understandable audit events for access, analysis, permission changes, exports, deletion, and attempted actions.
- Approval records for consequential actions.
- Audit entries should avoid raw sensitive content when counts, identifiers, or hashes are sufficient.
- Source, observation time, confidence, and stale/incomplete labels for recommendations.

### Information disclosure

Threats:

- Secrets or sensitive records committed to Git, exposed through Pages, retained in logs, stored in plaintext exports, leaked through browser storage, or sent to an unnecessary service.

Phase 0 controls:

- Synthetic data only.
- Automated rejection of common secret/database files and personal-data export paths.
- No real provider registration or token handling.
- Browser vault is not approved for real personal data during Phase 0.

Required future controls:

- Separate encrypted token vault and personal-data store.
- Managed key service and per-user envelope encryption.
- Minimal collection, narrow date windows, field minimization, and retention enforcement.
- Redacted structured logs.
- Content Security Policy, output encoding, dependency review, and bridge isolation.
- End-to-end encryption only where the server does not need plaintext; no exaggerated claim where server-side analysis requires decryption.

### Denial of service

Threats:

- Connector rate exhaustion, corrupted local state, unavailable backend, runaway jobs, or a lockout caused by failed recovery.

Required controls:

- Bounded queries, job timeouts, retries with backoff, circuit breakers, quotas, backup restoration tests, and an offline degraded mode that states its limitations.
- Security controls must fail closed without pretending the application is connected.

### Elevation of privilege

Threats:

- Read-only connector gaining write capability, cross-user data access, JavaScript bridge abuse, or administrative functions exposed to normal sessions.

Required controls:

- Read-only scopes by default.
- One connector at a time.
- Server-side authorization on every request.
- Cross-user isolation tests.
- Separate service identities and minimum cloud permissions.
- Narrow native bridge command allowlists.
- No write permissions until separately requested, designed, reviewed, and explicitly approved.

## 7. Browser and PWA-specific risks

- Cross-site scripting can read any data accessible to the page, including decrypted in-memory vault content.
- Browser extensions may inspect pages or storage.
- `localStorage` is not approved for sensitive plaintext, credentials, keys, or real personal records.
- Encrypted ciphertext in browser storage still requires review of key derivation, offline guessing, shared-device access, deletion, and backup tampering.
- Back-forward-cache restoration must re-lock the app and clear decrypted DOM and memory state.
- Service-worker caching must not preserve sensitive responses. The static shell should cache only the minimum public application shell.

## 8. Native bridge risks

- A compromised bundled web asset could call any exposed native bridge command.
- Full-access operating-system permission may exceed the application's implemented read-only behavior.
- Native caches and persistent web-view storage may retain data.

Required controls before approval:

- Explicit command allowlist, input bounds, origin/file validation, no native network client unless separately reviewed, nonpersistent storage where practical, on-device tests, entitlement inspection, and revocation/deletion verification.

## 9. Coaching and AI risks

- Unsupported claims presented as facts.
- Recommendations based on stale, partial, or misclassified data.
- Sensitive context sent beyond the minimum necessary service.
- Advice that encourages unsafe financial, medical, legal, or relationship actions.

Required controls:

- Separate facts, estimates, assumptions, inferences, unknowns, and recommendations.
- Evidence references, observation time, confidence, and missing-data indicators.
- Deterministic rules for high-impact calculations.
- No autonomous consequential actions.
- User correction and deletion controls.
- Minimized evidence bundles rather than unrestricted life-history transmission.

## 10. Security assumptions

- The accepted baseline and recorded checksums are the current source of truth.
- GitHub and GitHub Actions are external trusted services but may fail or be compromised.
- The user's endpoint may contain malicious software or extensions.
- No system can provide zero risk.
- Phase 0 documentation and tests reduce uncertainty but are not an independent security audit.

## 11. Exit criteria

Phase 0 may be considered review-complete only when:

- Exact normalized source is reproducible from the locked archive and patch.
- Hash, syntax, secret, and security-contract checks pass.
- Threat model, data flow, security gates, residual risks, and verification report are present.
- No personal data or provider credential has been used.
- No deployment, merge, publication, or provider connection occurred.
- The user gives explicit approval before the next phase.
