# Gate 2D — Owner-Controlled AWS Account Bootstrap

Status: approved but not executed  
Region: `us-east-1`  
Resource deployment: prohibited

## Why this step cannot be automated here

Creating the management account requires the owner's dedicated mailbox, legal/contact information, payment method, phone verification, password, and phishing-resistant MFA. Those values must be entered directly into AWS by the owner. They must not be sent through GitHub, committed to source, or shared in chat.

No AWS account or credential is connected to this environment, so this package does not claim account creation.

## Ordered bootstrap

1. Create or identify only the dedicated AEGIS management account.
2. Deliberately choose paid pay-as-you-go if the account must become an AWS Organizations management account; do not accidentally end an AWS Free Plan period.
3. Use a dedicated controlled mailbox or alias for the account.
4. Protect root with a passkey or hardware security key and a separately protected backup MFA method.
5. Confirm root has no access keys and is not used for daily administration.
6. Configure primary, billing, security, and operations contacts.
7. Record the 12-digit account ID in the owner's password manager—not in the repository.
8. Set `us-east-1` as the working Region.
9. Configure IAM Identity Center and an owner-only temporary administrative session.
10. Create a temporary Gate 2D validation permission set using the committed allow/deny policy.
11. Run only the read-only validation script.
12. Revoke or remove the temporary validation assignment after evidence review.
13. Stop. Do not create an Organization, Control Tower landing zone, budget, database, key, API, user pool, connector, or workload in this gate.

## Immediate stop conditions

Stop if AWS proposes an unexpected support plan, nonessential marketplace product, additional Region, root access key, IAM user access key, workload resource, or automatic deployment.

Stop if the connected account ID differs from the owner-approved account ID or the active Region differs from `us-east-1`.

## Account-creation behavior

AWS Organizations member-account creation is asynchronous. A successful request does not prove that initialization has finished; status must be checked separately. Gate 2D deliberately does not automate `CreateAccount`.
