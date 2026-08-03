# AEGIS Champion Home v0.9.0

## Decision

The owner accepted AEGIS Champion Local Core v0.8.1 as functional progress but rejected the presentation as too similar to an AWS or enterprise administration console. This stage preserves the verified local core and replaces only the presentation hierarchy with a welcome-first personal operating-system home experience.

## Exact base

- Base branch: `agent/aegis-champion-local-core-v080`
- Base reviewed SHA: `fdde8389e2114314103e042a6a9ae3c7b9d9c9b0`
- Head branch: `agent/aegis-champion-home-v090`
- Production v0.4.1 remains untouched.
- AWS Gate 2A–2D remain excluded.
- No merge or deployment is authorized.

## Owner visual feedback being addressed

The accepted screenshots demonstrated that the launcher, navigation, permissions, audit, system boundaries, and synthetic overview worked. They also demonstrated these presentation defects:

- Home resembled a cloud or AWS control console.
- Security and infrastructure statuses dominated the emotional first impression.
- The experience felt technical rather than welcoming.
- Motion and visual identity were too restrained.
- The interface did not yet feel like a daily personal home screen.

## Locked visual acceptance criteria

Champion Home must:

1. greet before it reports;
2. present one dominant Best Next Action;
3. include a visibly living Champion presence;
4. use Aurora Frost with layered depth rather than a flat enterprise grid;
5. organize the day into human-centered Today, Focus, Balance, and Recovery modules;
6. keep technical truth available in the Shield Room;
7. retain visible synthetic-only, zero-account, zero-paid-service, sync-off boundaries;
8. animate ambient light, the Champion core, and view transitions;
9. honor `prefers-reduced-motion`;
10. remain usable without horizontal overflow at a 390-pixel viewport.

## Security and trust invariants

The redesign may not introduce:

- real personal, financial, health, email, calendar, message, credential, account, device, or location data;
- AWS runtime access, SDKs, credentials, resources, deployments, organization changes, or billing actions;
- OAuth, provider tokens, connectors, cloud synchronization, or external runtime requests;
- purchases, transfers, messages, deletions, account changes, or autonomous actions;
- administrator requirements or a Python dependency;
- API route caching or external service-worker assets.

## Automated evidence required

The exact pull-request head must pass:

- the inherited Gate 1 synthetic-only verifier;
- the Champion zero-spend and welcome-first verifier;
- nineteen security, launcher, accessibility, responsive-layout, and experience mutation tests;
- fifteen inherited coach and encrypted-vault tests;
- PowerShell server validation;
- loopback static delivery and security-header checks;
- HTTP 405 rejection for `POST`;
- HTTP 403 rejection for package-root traversal;
- real Chromium desktop Home validation;
- real Chromium 390-pixel mobile validation;
- reduced-motion emulation;
- Shield Room boundary validation;
- same-origin offline-cache validation;
- zero external runtime requests;
- zero browser exceptions;
- ZIP checksum and archive-integrity validation;
- desktop and mobile screenshot artifact generation.

## Status language

Allowed only after exact-head CI succeeds:

> AEGIS Champion Home v0.9.0 is automated-review-complete as a welcome-first, synthetic, zero-spend, local-only visual-acceptance build.

Not allowed:

- production-ready;
- personal-data-ready;
- cloud-ready;
- fully secure;
- independently audited;
- complete working OS;
- deployed;
- connected;
- visually accepted by the owner.
