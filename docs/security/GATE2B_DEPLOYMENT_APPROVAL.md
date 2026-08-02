# Gate 2B Deployment Approval Boundary

This document records what the current approval does and does not authorize.

## Authorized now

- Create and update the review branch.
- Commit the AWS architecture blueprint.
- Run local and GitHub-hosted static tests.
- Open one draft pull request.
- Document current AWS requirements and residual risk.

## Not authorized

- Creating or connecting an AWS account.
- Configuring billing or payment.
- Creating IAM users, roles, access keys, or federation.
- Configuring AWS credentials in GitHub.
- Running CloudFormation create-stack, deploy, execute-change-set, or Terraform apply.
- Reserving a Cognito domain.
- Creating a user or enrolling a passkey.
- Creating KMS keys, a VPC, database, DynamoDB table, S3 bucket, or CloudTrail trail.
- Deploying application code.
- Connecting Calendar, Gmail, finance, health, messages, location, or any provider.
- Importing personal data.
- Merging the draft pull request.
- Publishing a production change.

## Required future approval sequence

1. **AWS account and cost approval**  
   Select account ownership, region, budget limit, billing alerts, and administrative identities.

2. **AWS validation approval**  
   Run `validate-template`, static AWS policy tooling, quota checks, and a no-execute CloudFormation change set.

3. **Foundation deployment approval**  
   Create only the reviewed identity, key, network, storage, and audit resources.

4. **Identity pilot approval**  
   Create the single owner account, complete bootstrap authentication, enroll passkeys, test recovery, revocation, and deletion.

5. **Backend deployment approval**  
   Add reviewed application compute, custom domain, WAF, service roles, private endpoints, monitoring, and database schema.

6. **Connector approval**  
   Gate 3 remains separate and permits only one sandboxed read-only connector after Gate 2 completes.

## Mandatory evidence before foundation deployment

- Exact template SHA.
- AWS account and region.
- Cost estimate and budget alarm.
- CloudFormation service-side validation.
- Change-set output.
- IAM and KMS policy review.
- Domain and certificate plan.
- Backup and deletion plan.
- CloudTrail destination and access review.
- Rollback plan.
- Incident contacts.
- Explicit deployment approval tied to the reviewed SHA.

The string `APPROVE_GATE2B_DEPLOYMENT` inside the template is only a technical brake. It is not itself authorization.
