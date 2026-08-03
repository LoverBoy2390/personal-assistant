# AEGIS Champion Local Core v0.8.0

Status: isolated review build  
Data mode: synthetic only  
External accounts: 0  
Paid cloud services: 0  
Deployment: none

AEGIS Champion is the user-facing assistant shell for AEGIS LifeOS. This milestone turns the reviewed deterministic coaching and encrypted-vault controls into one installable local-first experience without introducing cloud infrastructure, provider connections, personal data, or consequential actions.

## Included

- Aurora Frost Champion interface with Overview, Timeline, Permissions, Audit, Vault, and System views.
- Deterministic synthetic daily brief with evidence, inference, confidence, and unknowns.
- Visible status for connected accounts, paid services, cloud synchronization, and local vault state.
- Reused reviewed Gate 1 encrypted synthetic-vault lifecycle.
- Installable web-app manifest and same-origin offline cache.
- Windows launcher bound only to `127.0.0.1`.
- Explicit system boundaries and minimized session audit history.

## Prohibited

- Real personal, financial, health, email, calendar, message, credential, account, or location data.
- AWS runtime access, credentials, SDKs, resources, deployments, or billing actions.
- OAuth, provider tokens, background provider jobs, or cross-device cloud synchronization.
- Purchases, transfers, messages, account changes, deletions, or other consequential actions.
- Production merge or deployment without separate review and approval.

## Local review on Windows

1. Download or check out this branch.
2. Open `src\aegis-champion`.
3. Run `START_AEGIS_CHAMPION.bat`.
4. Review only with the included synthetic data.
5. Close the launcher window to stop the local server.

The launcher binds Python's static server to the loopback interface only. It does not expose the app to the local network.

## Phone review

The shell is installable when served over HTTPS or from a local development environment that satisfies browser service-worker requirements. This branch is not deployed. Do not create a cloud deployment merely to test it.

## Security boundary

The inherited vault remains a review prototype. Passing automated tests does not constitute an independent security audit or approval for personal data. Losing a vault passphrase makes that local encrypted envelope unrecoverable.
