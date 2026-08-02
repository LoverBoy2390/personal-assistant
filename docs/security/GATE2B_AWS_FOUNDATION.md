# AEGIS Gate 2B — AWS Production Foundation Blueprint

Status: draft implementation for review  
Parent: `agent/aegis-protected-backend-v070`  
Mode: synthetic and configuration-only  
AWS account connected: no  
Deployment: no  
Personal data: prohibited  
Provider connectors: none

## Purpose

Gate 2B translates the provider-neutral Gate 2A security contracts into a concrete AWS infrastructure blueprint without creating any AWS resource. It chooses one production direction so later work is not built on ambiguous identity, key-management, storage, and audit assumptions.

## Selected architecture

### Identity

Amazon Cognito managed login is the selected identity boundary.

- User-pool tier: Essentials.
- First factors: WebAuthn passkey and password bootstrap.
- Passkey user verification: required.
- Self-service account creation: disabled.
- Email changes require verification.
- Optional TOTP MFA remains available for password fallback.
- Managed login version 2.
- Public app client with no client secret.
- OAuth authorization-code flow only.
- Five-minute access and ID tokens.
- One-day rotating refresh token with zero retry grace.
- Token revocation and user-existence error suppression enabled.

The template does not create a user. It does not represent Cognito as deployed, configured, or independently security-reviewed.

### API boundary

An API Gateway HTTP API shell and JWT authorizer are defined, but the default execute-api endpoint is disabled and there are no routes or integrations.

The JWT authorizer pins:

- the Cognito user-pool issuer;
- the exact app-client audience;
- the `Authorization` header as the only token source.

A future application integration must still recheck user identity, device status, authorization epoch, required scope, and record ownership server-side.

### Key hierarchy

Four single-Region customer-managed KMS purposes are defined:

1. User data and Aurora storage.
2. Provider-token ciphertext.
3. Managed service secrets.
4. Security logs and CloudTrail.

All keys enable automatic rotation, use a 30-day deletion window, and are retained when the stack is removed. Multi-Region keys are intentionally not used in the initial blueprint because cross-Region decryption is not yet required.

### Network

The blueprint defines three private subnets across three Availability Zones.

- No internet gateway.
- No NAT gateway.
- No public route.
- No automatic public IP.
- Application security group has no inbound or outbound rule.
- Database accepts PostgreSQL only from the application security group.

Application compute and VPC endpoints are intentionally deferred until their exact service identity and network needs are approved.

### User-data store

Aurora PostgreSQL Serverless v2 is the selected structured user-data store.

- Private-only database instances.
- KMS encryption.
- Managed master credential encrypted with the secrets-purpose key.
- IAM database authentication enabled.
- Deletion protection enabled.
- Thirty-five-day automated backup retention.
- Snapshot on cluster deletion or replacement.
- Two database instances for availability.

The template does not define application database roles, migrations, row-level security, or connection pooling. Those remain mandatory before personal data.

### Provider-token vault

A separate DynamoDB table is selected for application-encrypted connector-token envelopes.

- Token-purpose KMS key.
- Point-in-time recovery.
- Deletion protection.
- TTL field for bounded retention.
- Retain policy.

No actual OAuth token, connector schema, or provider integration is present.

### Security audit

The blueprint defines:

- a dedicated KMS-encrypted S3 bucket;
- versioning;
- S3 Object Lock governance retention;
- all public access blocked;
- TLS-only bucket access;
- Multi-Region CloudTrail;
- global service events;
- management read/write events;
- log-file validation.

Application audit events from Gate 2A are not yet sent to this archive. The production event pipeline, alerting, monitoring, and privacy filters remain separate work.

## Deployment brake

Every resource is conditioned on:

`DeploymentApproval == APPROVE_GATE2B_DEPLOYMENT`

The default value is `NOT_APPROVED`.

CloudFormation rules also reject an approved deployment that retains the placeholder `example.invalid` callback or logout URLs.

This brake is not a substitute for IAM controls, change-set review, account separation, or human approval. It exists to prevent accidental deployment from the committed template.

## Verified in this stage

- JSON template parses.
- Every resource is behind the explicit approval condition.
- No access key, user, pipeline, application route, or integration is defined.
- Cognito passkey, OAuth, rotation, revocation, and deletion controls are statically asserted.
- Private-network, database, token-vault, KMS, audit-bucket, and CloudTrail controls are statically asserted.
- Mutation tests prove that unsafe changes fail the verifier.
- The CI workflow is read-only and contains no AWS credentials or deployment command.

## Not verified

- AWS CloudFormation service-side validation.
- Regional service availability.
- Account quotas, pricing, names, certificates, or domains.
- A deployed Cognito passkey ceremony.
- Actual KMS grants or service-linked roles.
- Aurora engine compatibility and restore operation.
- CloudTrail delivery and digest validation.
- Security Hub, GuardDuty, WAF, alarms, or paging.
- Penetration test or independent architecture review.

## Honest release labels

- Proposed: production AWS account layout, custom domains, WAF, compute, service roles, alarms, operational backup and recovery.
- Built: review-only CloudFormation blueprint and static policy tests.
- Tested: local and CI static/mutation tests only.
- Installed: no.
- Deployed: no.
- Connected: no.
- Production-ready: no.

## Exit boundary

Gate 2B may be called review-complete after the exact-head CI checks pass. Actual AWS validation, account setup, resource creation, deployment, identity enrollment, and personal-data use each require separate explicit approval.
