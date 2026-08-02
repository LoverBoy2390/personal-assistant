# Gate 2B AWS Source Record

Reviewed: 2026-08-02  
Source policy: official AWS documentation only

## Cognito and API authorization

- Amazon Cognito user pools can support password, passkey, and one-time-password sign-in.
  - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html
- Choice-based sign-in and WebAuthn require the Essentials tier or higher.
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-signinpolicy.html
- Passkey RP ID should be selected before public launch because changing it requires passkey re-registration.
  - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html
- Cognito app clients support authorization-code flow, token revocation, user-existence error suppression, and refresh-token rotation.
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpoolclient-refreshtokenrotation.html
- API Gateway HTTP API JWT authorizers validate issuer, audience/client ID, token timing, and optional route scopes.
  - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigatewayv2-authorizer-jwtconfiguration.html

## Encryption and storage

- AWS KMS records key management and use in CloudTrail and supports region-isolated keys.
  - https://docs.aws.amazon.com/kms/latest/cryptographic-details/design-goals.html
- Multi-Region keys should be used only when cross-Region cryptographic interoperability is required.
  - https://docs.aws.amazon.com/kms/latest/developerguide/mrk-when-to-use.html
- CloudFormation KMS keys support rotation and a 7–30 day pending deletion window.
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-kms-key.html
- RDS/Aurora supports storage encryption, deletion protection, IAM database authentication, and KMS keys.
  - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbcluster.html
  - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Secrets Manager recommends least privilege and blocking broad resource policies.
  - https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html
  - https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-policies.html

## Audit and policy checks

- CloudTrail supports KMS-encrypted logs and log-file validation; the KMS key and log bucket must be region-compatible.
  - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html
  - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html
- CloudFormation Guard is policy-as-code, but it does not perform full CloudFormation syntax/property validation and does not enforce server-side deployment policy.
  - https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html

## Decisions derived from the sources

- Use Cognito managed login version 2 and WebAuthn with required user verification.
- Use authorization-code flow only and no public-client secret.
- Enable refresh-token rotation with zero grace and token revocation.
- Pin API Gateway JWT issuer and audience.
- Use single-Region KMS keys until cross-Region recovery is explicitly approved.
- Separate data, token, secrets, and log key purposes.
- Require CloudTrail log validation and protected KMS-encrypted storage.
- Treat local static checks as review evidence only, not AWS service-side validation.
