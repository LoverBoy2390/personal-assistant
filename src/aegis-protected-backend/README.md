# AEGIS Protected Backend Security Kernel

Status: Gate 2A provider-neutral review prototype  
Data mode: synthetic only  
Network mode: loopback test server only  
Connectors: none

This directory proves backend security contracts before selecting or connecting a production identity, hosting, database, or managed key service.

## Implemented

- Synthetic test-only enrollment adapter with expiring one-use challenges.
- Short-lived signed access sessions.
- Opaque refresh-token rotation and replay-family revocation.
- Device enrollment and revocation.
- Server-side scope enforcement and cross-user isolation.
- Per-record AES-256-GCM envelope encryption.
- Separate key purposes for sessions, user data, token-vault records, audits, and backups.
- Tamper-evident HMAC audit chain using pseudonymous subjects.
- Encrypted backup, authenticated restore, retention purge, export, and permanent account deletion.
- Loopback-only HTTP exception for tests; non-test mode requires encrypted transport or trusted TLS metadata.
- No provider connector and no real token.

## Not implemented or claimed

- Real passkeys or a hardened OIDC provider.
- Production device attestation.
- Managed KMS/HSM, cloud database, production TLS termination, or trusted-proxy configuration.
- Multi-region backup, disaster recovery, operational monitoring, or independent penetration testing.
- Any Gmail, Calendar, finance, health, message, location, or other personal source.

The synthetic identity adapter must never be enabled in a production deployment. The code is a security-contract prototype, not a production-ready authentication service.
