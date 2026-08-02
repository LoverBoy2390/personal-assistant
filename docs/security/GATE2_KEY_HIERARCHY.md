# Gate 2 Key Hierarchy

Status: provider-neutral design and local contract test

## Purposes

| Purpose | Protects | Must be isolated from |
|---|---|---|
| Session | Access-session signatures | Data, token, audit, backup keys |
| Data | Wrapped per-record user-data keys | Token-vault keys |
| Token | Wrapped per-record connector-token keys | User-data keys |
| Audit | Tamper-evident audit chain | Session and content encryption |
| Backup | Encrypted recovery packages | Active data and token wrapping keys |

## Envelope model

1. Generate a unique random 256-bit data-encryption key per record or backup.
2. Encrypt content with AES-256-GCM and authenticated metadata.
3. Wrap the data-encryption key with the active purpose-specific key.
4. Store the wrapping key ID beside the encrypted envelope.
5. Rotate a purpose key by creating a new version and making it active.
6. Rewrap data-encryption keys without decrypting or rewriting record content.
7. Retain old key versions only for the defined migration and recovery window.
8. Verify migration, backup restoration, and deletion before retiring a key version.

## Production requirements not satisfied locally

- Managed KMS or HSM-backed root keys.
- Service identity and authorization for unwrap operations.
- Key-use audit logs independent from the application.
- Regionality and residency policy.
- Automated rotation, disablement, destruction, and emergency revocation.
- Dual control for destructive key operations.
- Recovery testing with a separately protected backup key.

No key material is committed to source control. Test keys are generated at runtime and disappear with the process.
