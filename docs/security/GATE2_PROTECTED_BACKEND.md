# AEGIS Gate 2A — Provider-Neutral Identity and Protected Backend Kernel

Status: draft implementation for review  
Parent: `agent/aegis-synthetic-coach-v061`  
Mode: synthetic data only  
Connectors: none  
Deployment: none

## Purpose

Gate 2A creates and tests the security contracts that a production identity and backend must satisfy before AEGIS selects a provider or connects any account. The synthetic identity adapter is not a passkey and is not a hardened OIDC provider. It exists only to exercise downstream security contracts with synthetic identities.

## Built in this stage

- Test-only, disabled-by-default synthetic identity adapter.
- Expiring, one-use enrollment challenges.
- Device enrollment and revocation.
- Two-minute signed access sessions.
- Rotating opaque refresh tokens with reuse detection and whole-family revocation.
- Server-side scope authorization.
- Cross-user data isolation.
- AES-256-GCM encrypted user-data records.
- Separate AES-256-GCM encrypted token-vault records using a different key purpose.
- Purpose-separated session, data, token, audit, and backup keys.
- Data-key wrapping and key-version rotation.
- Pseudonymous tamper-evident audit events.
- Retention expiry, user export, permanent deletion, encrypted backup, and authenticated restore.
- Loopback-only dynamic API tests and mandatory secure transport outside test mode. Forwarded-protocol headers are accepted only when an explicitly trusted proxy boundary is configured.

## Identity boundary

The synthetic identity adapter exists only to test downstream authorization and lifecycle logic. It is disabled unless explicitly constructed for tests. It does not verify WebAuthn signatures, OIDC issuer metadata, attestation, origin, relying-party ID, or provider assurance level.

Production Gate 2 completion still requires exactly one reviewed identity path:

- Passkeys/WebAuthn with verified challenge, origin, relying-party ID, signature counter policy, recovery, and device lifecycle; or
- Hardened OIDC with issuer/audience validation, PKCE, nonce/state, assurance policy, provider recovery, and administrative controls.

## Session contract

- Access tokens are short-lived and signed with a versioned session key.
- Every token binds user, device, refresh family, scopes, issue time, expiry, and unique token ID.
- Every API authorization checks signature, expiration, device status, and required scopes server-side.
- Refresh tokens are opaque; only hashes are retained.
- Rotation marks the previous token used.
- Reuse of a rotated token revokes the entire refresh family.
- Device revocation invalidates access checks and associated refresh families.

## Encryption contract

Each record receives a unique random 256-bit data-encryption key. The record is encrypted with AES-256-GCM and authenticated metadata. The data-encryption key is wrapped by a purpose-specific versioned key. User-data and token-vault records use different key purposes.

This local key hierarchy proves envelope and rotation logic only. It is not a managed KMS or HSM.

## Audit contract

Audit entries contain pseudonymous subject hashes, bounded action/result fields, minimized metadata, sequence number, previous hash, key ID, and an HMAC chain value. Raw aliases, credentials, access tokens, refresh tokens, record values, and provider content are excluded.

## Lifecycle contract

- Retention expiry purges encrypted records.
- Export decrypts only the authenticated user's records and omits credential hashes and tokens.
- Encrypted backup uses a separate backup key purpose and authenticated encryption.
- Restore verifies authentication, synthetic-data marker, checksum, and owner hash.
- Permanent deletion removes identity, devices, sessions, user-data records, and token-vault records while retaining a pseudonymous deletion audit event.

## Dynamic API boundary

The included HTTP service is for loopback synthetic testing. It:

- binds to loopback in test mode;
- rejects non-test cleartext transport;
- enforces bounded JSON bodies;
- returns no-store security headers;
- exposes no provider connector;
- logs no token or record content.

Production transport still requires real TLS termination, trusted-proxy validation, HSTS, certificate operations, rate limiting, abuse controls, and infrastructure review.

## Tests

- Synthetic identity disablement and enrollment-challenge expiration.
- Authentication and authorization matrix.
- Access expiry and scope enforcement.
- Refresh rotation, replay detection, and family revocation.
- Device revocation.
- Cross-user isolation.
- Encryption opacity and data/token key separation.
- Key rotation and record recovery.
- Audit tamper detection.
- Encrypted backup restore and corruption rejection.
- Retention purge, export minimization, and permanent deletion.
- TLS/loopback transport policy.
- Dynamic loopback API behavior.

## Honest status

- Proposed: production identity provider, managed KMS, cloud database, trusted TLS edge, monitoring, backup infrastructure, and incident operations.
- Built: provider-neutral synthetic security kernel and loopback API test service.
- Tested: only the committed unit, static, and dynamic loopback contracts.
- Installed: no production service.
- Deployed: no.
- Connected: no.
- Production-ready: no.

Gate 2 is not complete until the external dependencies in `GATE2_EXTERNAL_DEPENDENCIES.md` are selected, configured, tested, and separately approved. No connector is authorized by this work.

## Approval boundary

Provider selection, provider configuration, deployment, use of any real identity, and Gate 2 exit require separate explicit approval. No provider connector is authorized by this stage.
