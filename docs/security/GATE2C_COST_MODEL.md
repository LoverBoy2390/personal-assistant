# Gate 2C Cost Model

Date: 2026-08-02  
Region basis: US East (N. Virginia) where regional pricing applies

## Fixed or near-fixed planning items

- AWS Organizations: no additional service fee.
- IAM Identity Center: no additional service fee.
- AWS Control Tower: no direct fee; the services it enables are billed.
- Four customer-managed KMS keys: approximately `$4/month` before request charges.
- Cognito Essentials: direct/social sign-in is within its indefinite free tier at fewer than 10,000 MAUs.
- AWS Budgets monitoring: no charge; action-enabled budgets beyond the first two can be billed.

## Variable items

- AWS Config configuration items generated across governed accounts and Regions.
- CloudTrail/S3/KMS request and storage volume.
- Aurora serverless active ACU-seconds, storage, I/O, and backup storage.
- API Gateway requests and data transfer.
- DynamoDB reads, writes, storage, point-in-time recovery, and backups.
- Email or SMS messaging if later enabled for Cognito recovery or MFA.

## Aurora planning formula

Aurora serverless compute is usage based. In US East (N. Virginia), AWS's published example uses `$0.12 per ACU-hour` for Aurora Standard. Supported engine versions can scale to `0 ACU` when inactive.

Illustrative compute only:

- Idle and paused all month: approximately `$0` ACU compute.
- Average `0.5 ACU` for 2 hours/day: `0.5 × 2 × 30 × $0.12 = $3.60/month`.
- Average `1 ACU` for 4 hours/day: `1 × 4 × 30 × $0.12 = $14.40/month`.
- Average `2 ACU` continuously: `2 × 730 × $0.12 = $175.20/month`, which violates this gate's cost ceiling.

Storage, I/O, backups, data transfer, and dependent services are additional.

## Budget policy

- `$1`: proves alerts work and surfaces unexpected account activity.
- `$10`: investigate service-level spend.
- `$25`: nonproduction monthly target reached.
- `$35`: mandatory stop/review threshold.
- `$40`: escalation; no new resources or test expansion.
- `$50`: organization hard ceiling; deployment remains blocked.

The cost model rejects the idea that “serverless” means free. It also rejects long-term commitments before stable utilization is measured.
