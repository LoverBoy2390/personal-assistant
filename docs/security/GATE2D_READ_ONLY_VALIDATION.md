# Gate 2D — Read-Only AWS Service Validation

Status: package prepared; AWS execution not performed

## Validation purpose

The validation confirms identity, account boundary, Region, organization state, Control Tower state, CloudFormation template acceptance, and relevant service quotas without creating a stack or resource.

## Approved calls

- STS `GetCallerIdentity`
- Organizations describe/list operations
- Control Tower list/get operations
- CloudFormation `ValidateTemplate`
- Service Quotas get/list operations
- Selected inventory describe/list operations for planned services

CloudFormation `ValidateTemplate` checks template syntax and structure. It does not prove that every resource property is valid, that quotas are sufficient, or that deployment will succeed. A change set and stack remain prohibited.

## Credential boundary

- IAM Identity Center temporary credentials only.
- Static root or IAM-user access keys are rejected.
- The expected 12-digit account ID must be supplied out of band.
- The script verifies the caller before any other validation.
- The script is locked to `us-east-1`.

## Evidence handling

Results can contain account IDs, ARNs, email-domain hints, service configuration, and quota information. They are written under `/tmp/aegis-gate2d` by default with restrictive permissions. The directory must be outside the Git repository.

Evidence is not uploaded automatically, not committed, and not sent to a provider. A checksum manifest is created locally.

## Explicitly prohibited

- Account, Organization, OU, or Control Tower creation
- Budget or billing mutation
- CloudFormation stack or change-set creation
- IAM role/user/policy mutation
- Secret, Parameter Store value, KMS decrypt, or credential reads
- Cognito, database, KMS, S3, API, or connector creation
- Any provider or personal-data connection

## Honest completion rule

Gate 2D has two distinct states:

1. **Preparation complete** — committed package passes static and mutation tests.
2. **Execution complete** — owner creates or identifies the management account, supplies an IAM Identity Center temporary session, and the service-side validation completes on the expected account.

Only state 1 is possible in this environment today.
