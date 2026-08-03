# AEGIS Champion Local Core v0.8.0

## Decision

AEGIS Champion is the user-facing assistant shell for AEGIS LifeOS. This gate resumes product development from the reviewed Gate 1 synthetic-coach head and intentionally excludes the stacked AWS planning branches.

The purpose is to create one installable, local-first review experience that demonstrates the intended Champion interaction model without introducing personal data, account connections, cloud synchronization, AWS runtime access, autonomous actions, or paid services.

## Exact base

- Base branch: `agent/aegis-synthetic-coach-v061`
- Base reviewed SHA: `829a7b3f6092c1d4a8853bf8c4689a9f783692c5`
- AWS Gate 2A–2D branches are not ancestors of this work.
- Production v0.4.1 remains untouched.

## Included capabilities

- Aurora Frost shell branded as AEGIS Champion.
- Overview, Timeline, Permissions, Audit, Vault, and System surfaces.
- Deterministic synthetic recommendations with evidence, inference, confidence, and unknowns.
- Explicit best-next-action presentation.
- Visible status for zero external accounts, zero paid services, disabled cloud synchronization, and local vault state.
- Reuse of the reviewed Gate 1 encrypted synthetic-vault modules.
- Installable web-app manifest and same-origin fail-closed offline cache.
- Windows launcher bound to `127.0.0.1` only.
- Read-only CI with pinned checkout and no persisted GitHub credentials.
- Static boundary verification, safety mutation tests, inherited coach/vault tests, and a real Chromium shell smoke test.

## Locked exclusions

- No real personal, financial, health, email, calendar, message, credential, account, device, or location data.
- No AWS SDK, credential, API call, resource, account mutation, deployment, or billing action.
- No OAuth, provider token, connector, background provider job, or external runtime request.
- No cloud synchronization or cross-device data transport.
- No purchases, transfers, messages, deletions, account changes, or other consequential actions.
- No production merge, GitHub Pages deployment, release publication, or personal-data approval.

## Threat boundary

This gate assumes the host operating system, browser, and local Python installation are not already compromised. The loopback launcher prevents intentional LAN exposure, but it is not a sandbox against malware running under the same user account.

The inherited encrypted browser vault remains a security-review prototype. Automated validation confirms defined behavior and regression boundaries; it is not an independent cryptographic audit or approval to store personal information.

## Required automated evidence

The exact pull-request head must pass all of the following:

1. Existing Gate 1 synthetic-only verifier.
2. Champion zero-spend boundary verifier.
3. Champion mutation suite that proves unsafe changes are rejected.
4. JavaScript syntax checks for Champion and inherited modules.
5. Existing deterministic coach and vault unit tests.
6. Real Chromium test proving:
   - Champion becomes ready;
   - required safety statuses are visible;
   - System boundaries are visible;
   - the Champion service worker registers;
   - only same-origin static assets are cached;
   - API routes are not cached;
   - no external network request occurs;
   - no browser runtime exception occurs.

## Human acceptance criteria

Before this gate can become ready for review, the owner must inspect the local build on Windows and confirm:

- Champion opens from the supplied loopback launcher.
- Navigation remains usable at desktop and narrow mobile widths.
- Aurora Frost styling remains faithful to the approved visual baseline.
- The synthetic-only and zero-spend boundaries are unmistakable.
- No screen implies that real accounts, cloud sync, or autonomous actions are active.
- Closing the launcher stops the local server.

## Gate status language

Allowed after exact-head CI passes:

> AEGIS Champion Local Core is review-complete as a synthetic, zero-spend, local-only shell.

Not allowed:

- production-ready;
- personal-data-ready;
- cloud-ready;
- fully secure;
- independently audited;
- complete working OS;
- deployed;
- connected.
