# AEGIS Gate 2B AWS Foundation

This directory contains a **review-only** AWS CloudFormation blueprint for the next AEGIS security foundation.

Nothing deploys with the default parameters. Every resource has the `DeploymentApproved` condition, and the default `DeploymentApproval` value is `NOT_APPROVED`.

## Included architecture

- Amazon Cognito managed login with WebAuthn/passkey support.
- Authorization-code OAuth flow only.
- API Gateway HTTP API shell with a Cognito JWT authorizer.
- Region-isolated KMS keys for user data, provider-token ciphertext, managed secrets, and security logs.
- Private VPC subnets with no internet gateway, NAT gateway, public route, or public IP assignment.
- Aurora PostgreSQL with encryption, managed master credentials, IAM database authentication, deletion protection, backups, and private access.
- DynamoDB token-vault table with a separate KMS key, point-in-time recovery, TTL, and deletion protection.
- KMS-encrypted, versioned, object-locked S3 security-log archive.
- Multi-Region CloudTrail with log-file validation.

## Intentionally absent

- No AWS credentials or account identifiers.
- No Lambda, container, application route, API integration, connector, provider token, or personal data.
- No public database or default API Gateway endpoint.
- No deployment workflow.
- No custom production domain, certificate, WAF, alerting, or operational role.
- No claim that this template has been deployed or validated by AWS CloudFormation.

## Review commands

```bash
python3 scripts/verify_gate2b.py
python3 -m unittest tests/test_gate2b.py
python3 -m json.tool infra/aws/gate2b/foundation.json >/dev/null
```

The GitHub Actions workflow performs only those read-only checks. It never configures AWS credentials and never calls a deployment command.

## Deployment boundary

A later approved deployment must:

1. Use reviewed non-placeholder callback and logout URLs.
2. Pass `DeploymentApproval=APPROVE_GATE2B_DEPLOYMENT`.
3. Run an AWS-native template validation and change-set review in the selected account.
4. Add custom domains, ACM certificates, WAF, trusted application compute, least-privilege service roles, alarms, backup operations, and incident contacts.
5. Receive separate explicit approval before creating resources or accepting personal data.
