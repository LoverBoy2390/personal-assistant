# Gate 2D Read-Only AWS Validation

Status: prepared, not executed against AWS.

This package bridges the reviewed Gate 2C plan to an owner-controlled AWS account without deploying AEGIS.

## What it contains

- A machine-readable bootstrap and validation plan.
- A least-privilege inspection policy with explicit mutation and sensitive-read denies.
- A shell runner that accepts only an IAM Identity Center profile, verifies the expected account and `us-east-1`, performs service inspection, and calls CloudFormation `ValidateTemplate`.
- Evidence controls that keep AWS account metadata outside the repository.
- Static and mutation tests ensuring no deployment or account-creation command enters the executable path.

## What it cannot do here

This environment has no AWS connector, owner account, payment method, dedicated account mailbox, root MFA device, or IAM Identity Center session. Therefore no AWS account was created and no AWS-side validation was run.

## Owner-controlled handoff

After the management account exists and root protection is complete, configure an IAM Identity Center permission set from `readonly-validation-policy.json`, sign in with temporary credentials, and run:

```bash
AEGIS_AWS_PROFILE=<sso-profile> \
AEGIS_EXPECTED_ACCOUNT_ID=<12-digit-id> \
AEGIS_EXPECTED_REGION=us-east-1 \
scripts/aws/gate2d_readonly_validate.sh
```

Do not paste credentials, account recovery codes, payment information, or MFA secrets into GitHub or ChatGPT.
