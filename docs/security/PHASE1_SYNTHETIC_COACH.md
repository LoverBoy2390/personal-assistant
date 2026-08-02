# AEGIS LifeOS Phase 1 — Synthetic Functional Coach

Status: draft review implementation  
Parent security foundation: `agent/aegis-secure-foundation-v060`  
Mode: synthetic data only  
Production impact: none

## Authorization boundary

Phase 1 was authorized after Phase 0 completed as a draft review package. This authorization covers a separate synthetic functional-coach branch, commits, automated checks, and one draft pull request.

The following remain prohibited without separate explicit approval:

- No personal data.
- No real account or provider connection.
- No OAuth registration, token exchange, secret, credential, backend, database, or KMS.
- No persistent browser storage or background synchronization.
- No consequential or autonomous action.
- No merge into `main`.
- No deployment or publication.

## Functional scope

The Phase 1 prototype demonstrates:

1. A daily brief generated from a versioned, explicitly synthetic fixture.
2. Deterministic recommendation ranking rather than opaque model output.
3. Source evidence, observed time, confidence, inference, and unknowns for every recommendation.
4. A best-next-action presentation that remains advisory-only.
5. In-memory permission controls for four demo domains: calendar, tasks, finance, and wellness.
6. A searchable synthetic timeline.
7. A minimized in-memory audit history for user-visible session actions.
8. Responsive Aurora Frost presentation without modifying the accepted v0.4.1 production baseline.

## Data flow

```text
Versioned synthetic fixture
          |
          v
Synthetic-only schema guard
          |
          v
Deterministic domain rules
          |
          +--> task urgency
          +--> upcoming commitment
          +--> seven-day demo cash buffer
          +--> low-risk wellness signal
          |
          v
Ranked advisory recommendations
          |
          +--> evidence and source time
          +--> confidence
          +--> inference
          +--> unknowns
          +--> explicit no-action policy
          |
          v
In-memory responsive interface
```

No runtime network path or persistence path exists in this phase.

## Safety properties

- The engine rejects any dataset not explicitly marked `synthetic: true`.
- Permission state can remove a complete domain from recommendations, evidence, and timeline results.
- Recommendation output is deterministic for a fixed fixture.
- Audit entries store only event name, domain, target identifier, result, and timestamp.
- The interface provides no execution control for transfers, purchases, messages, account changes, or record deletion.
- The static verifier blocks common network and browser-persistence APIs.
- CI operates with read-only repository permissions and an immutable checkout reference.

## Verification matrix

| Check | Method |
|---|---|
| Reject non-synthetic input | Node test |
| Deterministic output | Node deep-equality test |
| Priority ranking | Node test |
| Permission isolation | Node test |
| Evidence and confidence contract | Node test |
| Timeline search and filtering | Node test |
| Audit minimization and clearing | Node test |
| No network or persistence APIs | Python static verifier |
| Read-only pinned CI | Python workflow verifier |
| JavaScript syntax | `node --check` |
| Static asset availability | loopback HTTP smoke test |
| Desktop and mobile interaction smoke | `PHASE1_LOCAL_TEST_RECORD.md` |

## Limitations and residual risk

- This is not an AI model, provider connector, production backend, or independent security audit.
- Static pattern checks can miss obfuscated or novel unsafe behavior.
- Synthetic rule quality does not prove recommendations will be accurate on real data.
- Confidence currently reflects fixture freshness and source availability, not calibrated real-world predictive accuracy.
- The demo uses browser JavaScript and therefore inherits normal browser and extension exposure if someone enters real data despite the prohibition.
- Accessibility, device coverage, and visual regression testing remain incomplete.
- Nothing here validates finance, health, email, calendar, or identity-provider integration.

## Completion and next gate

Phase 1 can be called review-complete only when its workflow passes on the current draft PR head and its changed-file scope remains limited to the synthetic coach, tests, verifier, workflow, Phase 1 security record, and local test record.

Keep the PR draft. No merge and no deployment are authorized. A sandbox connector or any real-data design requires separate explicit approval after review of this prototype and its residual risks.
