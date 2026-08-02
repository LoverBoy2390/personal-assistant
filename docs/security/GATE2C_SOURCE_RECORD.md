# Gate 2C Official AWS Source Record

Reviewed: 2026-08-02

Only first-party AWS documentation and pricing pages were used for the account, Region, and cost plan.

## Region and database

- Aurora serverless supported Regions and PostgreSQL versions: AWS Aurora User Guide.
- Aurora serverless scaling to zero: AWS What's New and Aurora documentation.
- Aurora pricing example for US East (N. Virginia): AWS Aurora pricing.

## Identity

- Cognito Essentials, managed login, and passkey requirements: Amazon Cognito Developer Guide.
- Cognito pricing and indefinite 10,000 MAU free tier for direct/social sign-in: AWS Cognito pricing.
- Root-user passkey/security-key MFA and no-root-access-key guidance: IAM User Guide.
- Temporary workforce credentials and IAM Identity Center: IAM best practices and IAM Identity Center documentation.

## Organization and governance

- Multi-account and management-account isolation: AWS Organizations best practices.
- Management, log archive, and audit account structure: AWS Control Tower documentation.
- Organizations, Control Tower, and IAM Identity Center direct service pricing: AWS pricing documentation.
- Warning that creating an organization from the AWS Free Plan upgrades to paid pay-as-you-go and ends the Free Plan credit period: IAM Identity Center enablement documentation.

## Cost control

- AWS Budgets monitoring pricing and action-budget charges: AWS Budgets pricing.
- Zero-spend budget template: AWS Cost Management User Guide.
- Cost Anomaly Detection timing and alert subscriptions: AWS Cost Management User Guide.
- KMS key pricing: AWS KMS pricing.
- API Gateway, DynamoDB, S3, and CloudTrail pricing: official AWS pricing pages.

## Limitation

This record supports planning only. No AWS Pricing Calculator estimate, account-specific discount, tax, service quota, service-side CloudFormation validation, or actual bill was available. All monthly ranges remain estimates until AWS account setup and read-only validation are separately approved.
