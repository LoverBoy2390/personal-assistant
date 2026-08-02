# Gate 2 External Dependencies and Completion Blockers

The provider-neutral kernel does not complete Gate 2. The following choices require separate review and explicit approval.

## Identity

- Select passkeys/WebAuthn or a hardened OIDC provider.
- Register production origins, redirect URIs, relying-party identifiers, and recovery policy.
- Define device enrollment, credential loss, account recovery, administrative access, and step-up authentication.
- Test issuer, audience, origin, nonce, state, PKCE, signature, expiration, and revocation behavior as applicable.

## Hosting and transport

- Select a protected backend runtime and private network architecture.
- Configure production TLS, HSTS, trusted proxy boundaries, rate limits, abuse controls, and denial-of-service protections.
- Separate public edge, application service, data stores, token vault, and administrative access.

## Key management and storage

- Select a managed KMS/HSM and document key ownership, region, access policy, rotation, recovery, disablement, and destruction.
- Select encrypted user-data and token-vault stores with separate identities and permissions.
- Define backups, recovery objectives, retention, deletion propagation, and proof of restoration.

## Operations and assurance

- Centralized redacted monitoring and alerting.
- Secret scanning, software-composition analysis, static analysis, dynamic testing, and dependency patching.
- Independent security review and penetration testing.
- Incident contacts, revocation runbooks, privacy policy, user consent, data-processing inventory, and deletion service levels.

## Completion rule

Gate 2 may be called complete only after one production identity path, protected hosting, managed key service, encrypted stores, operational controls, and the full Gate 2 test matrix pass in a production-like environment. Until then, no provider connector and no real personal data are authorized.
