# Gate 2C Account-Creation Checklist

This checklist is planning material only. No step has been performed.

## Required inputs before account creation

- A dedicated, strongly protected management-account mailbox or alias.
- Separate controlled aliases for billing, security, operations, log archive, audit, and nonproduction accounts.
- A payment method and billing address controlled by the owner.
- Primary and backup phishing-resistant MFA devices.
- A recovery phone number and mailbox recovery process that do not depend on the same single device.
- Acceptance of paid pay-as-you-go status and the `$50/month` organization ceiling.

## Ordered setup

1. Create only the management account with paid-plan intent.
2. Protect root with a passkey or hardware security key and a backup MFA device.
3. Confirm there are no root access keys.
4. Set primary, billing, security, and operations contacts.
5. Create the zero-spend budget and `$1/$10/$25/$40/$50` notifications.
6. Enable Cost Anomaly Detection when sufficient billing history exists.
7. Enable AWS Organizations.
8. Launch AWS Control Tower with `us-east-1` as the home and only governed Region.
9. Create or designate the log archive and security audit accounts.
10. Create the nonproduction workload account; do not create production.
11. Enable IAM Identity Center in `us-east-1` and use temporary sessions.
12. Create separate administrator, security-auditor, billing-viewer, and nonprod-developer permission sets.
13. Enable centralized member-account root access management.
14. Remove member-account root credentials after account contacts and recovery paths are verified.
15. Attach service-control guardrails that block organization departure, account closure, unapproved Regions, and high-cost services after policy simulation and review.
16. Verify the consolidated bill, budgets, contacts, access portal, CloudTrail delivery, and Config scope.
17. Stop. No Gate 2B foundation deployment occurs in this checklist.

## Stop conditions

Stop immediately if:

- A root access key exists.
- MFA or recovery is incomplete.
- Any workload appears in the management account.
- Control Tower proposes additional governed Regions without approval.
- A NAT Gateway, public IPv4 address, EC2 instance, database, or production account would be created.
- The forecast exceeds `$35/month` before a workload is deployed.
- The owner cannot identify which account will receive logs, security findings, and the consolidated bill.
