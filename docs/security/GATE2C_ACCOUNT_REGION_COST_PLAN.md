# AEGIS Gate 2C — AWS Account, Region, and Cost Plan

Status: review-complete planning target  
Mode: no AWS account connected  
Deployment: prohibited  
Primary Region: `us-east-1`  
Recovery Region: `us-east-2`, inactive until separate approval

## Decision

Use a dedicated AWS Organizations and AWS Control Tower landing zone with four initial accounts:

1. `aegis-management` — billing, organization, IAM Identity Center, and governance only.
2. `aegis-log-archive` — centralized security and audit logs only.
3. `aegis-security-audit` — read-only security findings and incident investigation.
4. `aegis-nonprod` — synthetic development and validation resources only.

The production workload account is deliberately deferred. This prevents AEGIS from paying for or accidentally populating a production environment before the nonproduction foundation, identity lifecycle, deletion, recovery, and cost controls are independently verified.

## Region selection

`us-east-1` is the single governed launch Region and IAM Identity Center Region.

Reasons:

- It is the nearest broad AWS Region to the user's South Carolina operating location.
- Aurora serverless PostgreSQL and its current platform are supported there.
- Cognito Essentials and passkeys are supported wherever standard commercial Cognito is available.
- The Gate 2B foundation's selected services are broadly available there.
- Keeping one governed Region prevents accidental multi-Region replication and duplicate logging/configuration charges.

`us-east-2` is recorded only as the future recovery Region. No resource, replica, backup copy, user pool, database, or key is authorized there in Gate 2C.

## Account-plan warning

Creating an AWS Organization from an AWS Free Plan account currently upgrades the account to paid pay-as-you-go and can end the Free Plan credit period. AEGIS must therefore make this transition intentionally rather than discovering it after clicking through Control Tower.

The production-grade choice is to create the management account with paid-plan intent, install cost controls first, and then create the organization. The project must not depend on promotional credits for the ongoing security baseline.

## Access controls

- Root user protected by a passkey or hardware security key plus a separately protected backup MFA device.
- No root access keys.
- No routine root use.
- Human administration through IAM Identity Center and temporary credentials.
- No long-lived IAM-user access keys for people.
- Centralized member-account root access management enabled.
- Member-account root credentials removed after recovery and account metadata are verified.
- Management account contains no application workload.

## Cost controls

Before Control Tower or any workload resource:

- Create a zero-spend budget.
- Add actual-spend alerts at `$1`, `$10`, `$25`, `$40`, and `$50`.
- Add a forecast alert at 80% of the `$50` organization ceiling.
- Enable Cost Anomaly Detection after enough billing history exists, with a `$1` absolute alert threshold.
- Activate cost-allocation tags: `Project`, `Environment`, `Owner`, `DataClass`, and `ManagedBy`.

Budget actions remain alert-only in this gate. Automatic permission changes or shutdowns can interrupt security logging and deletion workflows and require a separate failure-mode review.

## Cost envelope

These are planning ranges, not AWS quotes:

| State | Monthly planning range | Main uncertainty |
|---|---:|---|
| Landing zone, no workload | `$3–$12` | AWS Config changes, log storage, notifications |
| Nonprod foundation, mostly idle | `$8–$20` | Four KMS keys, low logs, Aurora wake time |
| Light synthetic testing | `$15–$40` | Aurora ACU-seconds, configuration churn, test frequency |

The organization hard ceiling is `$50/month`. The nonproduction operating target is `$25/month`, with mandatory review at `$35/month` actual or forecasted spend.

## Cost-driver prohibitions

The following remain blocked without separate approval:

- NAT Gateway.
- Public IPv4 charges.
- Always-on provisioned compute.
- Multi-Region replication.
- Aurora I/O-Optimized.
- Control Tower Account Factory for Terraform.
- Paid AWS Support plan.
- Savings Plans, Reserved Instances, or other long-term commitments.

## Honest status

- Account selected: architecture only.
- Region selected: `us-east-1`.
- Cost ceiling selected: `$50/month` organization-wide.
- AWS account created: no.
- Organization created: no.
- Control Tower launched: no.
- AWS credentials supplied: no.
- AWS service-side validation: no.
- Resources created: no.
- Billing incurred by this work: no.

## Next gate

Gate 2D may authorize account creation and read-only AWS service validation. It must not authorize CloudFormation deployment, passkey enrollment, database creation, connector registration, or personal data.
