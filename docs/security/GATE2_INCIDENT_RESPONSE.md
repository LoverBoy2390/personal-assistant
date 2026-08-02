# Gate 2 Incident and Revocation Plan

Status: pre-production operating requirement

## Trigger classes

- Suspected access-token theft.
- Refresh-token reuse detection.
- Lost or compromised device.
- Identity-provider compromise or misconfiguration.
- KMS/key exposure or unauthorized unwrap.
- Cross-user authorization failure.
- Backup disclosure or failed deletion.
- Audit-chain verification failure.

## Immediate containment

1. Revoke the affected refresh family and device.
2. Invalidate active sessions through device status and account authorization epoch in the production design.
3. Disable affected provider credentials and connector jobs; Gate 2 currently has no connector.
4. Restrict key use and rotate the affected purpose key.
5. Preserve minimized audit evidence without copying sensitive payloads into logs.
6. Stop deployments and data ingestion until scope is understood.

## Investigation

- Establish affected user, device, session family, key purpose, and time window.
- Verify audit-chain integrity and infrastructure access records.
- Check cross-user authorization boundaries.
- Determine whether encrypted content, wrapping keys, backups, or plaintext while in use were exposed.
- Record unknowns and confidence; do not overstate containment.

## Recovery

- Re-enroll trusted devices and identity credentials.
- Rotate session, data, token, audit, or backup keys according to exposure.
- Rewrap encrypted data where appropriate.
- Restore only from authenticated backups with owner and integrity validation.
- Verify permanent deletion for data that must not be retained.
- Complete post-incident tests before reconnecting any provider.

## External dependencies

Production incident response requires owner contacts, alerting, provider revocation procedures, KMS emergency controls, backup operators, legal/privacy review, user notification criteria, and documented recovery objectives. None is represented as operational in this draft.
