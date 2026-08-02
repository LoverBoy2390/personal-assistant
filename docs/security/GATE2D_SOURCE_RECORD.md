# Gate 2D Official AWS Source Record

Reviewed: 2026-08-02

Only first-party AWS documentation was used.

- AWS Organizations `CreateAccount`: account creation is asynchronous and requires status checking.
- AWS Organizations `DescribeCreateAccountStatus`: retrieves asynchronous account-creation status.
- AWS root-user best practices: protect root with MFA, avoid routine root use, and do not create root access keys.
- IAM security best practices: use federation and temporary credentials for humans.
- IAM Identity Center CLI credentials: obtain temporary credentials through the AWS access portal or SSO configuration.
- AWS STS `GetCallerIdentity`: confirms the active AWS account and principal.
- CloudFormation `ValidateTemplate`: checks template syntax/structure but does not provide full deployment assurance.
- CloudFormation best practices: use template validation and policy-as-code before deployment.
- AWS Control Tower Account Factory: account provisioning is an administrative, state-changing operation and is not included in this read-only package.

No third-party setup guide or credential-management product is required by this package.
