# Gate 2B AWS Threat Model

Status: pre-deployment review model

## Assets

- Identity credentials and passkeys.
- Access and refresh tokens.
- Device enrollment and revocation state.
- User records and derived recommendations.
- Connector refresh-token ciphertext.
- Database credentials.
- KMS keys and grants.
- Backups, audit records, and CloudTrail logs.
- Infrastructure configuration and deployment authority.

## Trust boundaries

1. User browser or native application to Cognito managed login.
2. Cognito token issuer to API Gateway JWT authorizer.
3. API Gateway to future application compute.
4. Application compute to Aurora.
5. Application compute to token-vault storage.
6. AWS services to KMS.
7. AWS services to CloudTrail and S3 audit storage.
8. CI/repository review to AWS deployment account.
9. Administrative operators to IAM, KMS, Cognito, database, and backups.

## Primary threats and controls

### Accidental deployment

Threat: review code creates expensive or sensitive AWS resources without approval.

Controls:

- every resource has the `DeploymentApproved` condition;
- default approval value is `NOT_APPROVED`;
- CI has no AWS credential action;
- CI contains no deployment command;
- placeholder redirect URLs are rejected when deployment is approved.

Residual risk: a person with AWS permissions can deliberately override the brake. Production requires account policy, protected environments, change sets, and explicit human approval.

### Account takeover

Threat: password compromise, recovery abuse, or session theft.

Controls:

- WebAuthn passkeys with required user verification;
- authorization-code flow only;
- no client secret in a public client;
- short access and ID token lifetime;
- refresh-token rotation, zero grace, and revocation;
- optional TOTP for password fallback;
- self-service signup disabled.

Residual risk: Cognito managed login does not by itself implement AEGIS device authorization epochs, application-session binding, or incident revocation. Those checks remain in the future application layer.

### Token substitution or replay

Threat: an ID token, wrong-audience token, expired token, or stolen refresh token is accepted.

Controls:

- API Gateway JWT authorizer pins issuer and audience;
- route scopes will be mandatory;
- token revocation and refresh rotation are enabled;
- default API endpoint and all routes are absent in this gate.

Residual risk: the future backend must reject ID tokens where access tokens are required and recheck user/device authorization.

### Cross-user access

Threat: an authenticated user accesses another user's records.

Controls:

- private stores;
- no application integration yet;
- Gate 2A server-side ownership contract remains mandatory;
- future database roles and row-level policies are blockers.

Residual risk: infrastructure encryption cannot prevent application authorization bugs.

### Key or ciphertext compromise

Threat: one key exposes all data classes.

Controls:

- separate KMS purposes for user data, tokens, secrets, and logs;
- automatic rotation;
- region isolation;
- envelope-encryption contract from Gate 2A;
- token storage separated from Aurora.

Residual risk: IAM or KMS-policy mistakes can still create broad decrypt authority. Production key policies, grants, and service identities need independent review.

### Public data-store exposure

Threat: database or token vault becomes internet-accessible.

Controls:

- private subnets;
- no internet or NAT route;
- no public IP assignment;
- Aurora instances explicitly not public;
- database ingress only from the future application security group;
- application security group starts with no egress.

Residual risk: future compute and endpoint additions can weaken the network boundary and must be reviewed.

### Log tampering or deletion

Threat: an attacker alters or erases evidence.

Controls:

- dedicated log KMS key;
- CloudTrail log-file validation;
- versioned Object Lock bucket;
- retain policies;
- TLS-only and public-access-block bucket policy;
- Multi-Region management-event trail.

Residual risk: governance-mode Object Lock can be bypassed by sufficiently privileged administrators. Production should consider compliance mode, separate log-archive account, organization trail, and independent alerting.

### Backup disclosure or failed deletion

Threat: backups outlive account deletion or expose data.

Controls:

- encryption and snapshots;
- explicit retention documentation;
- separate token-vault TTL;
- Gate 2A deletion and authenticated backup contracts.

Residual risk: AWS backup-copy lifecycle and deletion propagation are not implemented in this blueprint.

## Abuse cases deferred to deployment design

- Credential stuffing and bot traffic.
- WAF and denial-of-service controls.
- Email-account takeover and recovery fraud.
- Insider access and break-glass use.
- KMS grant misuse.
- Dependency and container compromise.
- Database injection and migration mistakes.
- Connector-provider compromise.
- Privacy leakage through logs, metrics, traces, or support tooling.
- Cross-Region recovery and key destruction.

## Stop conditions

Deployment must stop if:

- any resource is public by default;
- identity uses implicit OAuth;
- the public client contains a secret;
- data and token vaults share a key;
- placeholder redirect URLs remain;
- application routes exist without server-side ownership checks;
- CloudTrail validation or encrypted logging is disabled;
- AWS credentials are introduced into pull-request CI;
- personal data is proposed before the full production-like Gate 2 test matrix.
