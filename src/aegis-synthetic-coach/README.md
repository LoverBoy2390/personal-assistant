# AEGIS Synthetic Coach

Status: Phase 1 review prototype  
Mode: synthetic data only  
Deployment: none

This directory contains a functional, deterministic AEGIS coaching sandbox. It demonstrates the intended user experience without connecting a real account or receiving personal data.

## Included

- Daily brief generated from an explicitly synthetic fixture.
- Deterministic recommendation ranking.
- Evidence, source time, confidence, inference, and unknowns for every recommendation.
- In-memory permission controls for calendar, tasks, finance, and wellness demo domains.
- Searchable synthetic timeline.
- Minimized in-memory session audit history.
- Responsive Aurora Frost interface.
- Advisory-only action policy.

## Explicitly excluded

- Network requests and background jobs.
- Persistent browser storage.
- OAuth, provider tokens, credentials, secrets, or account identifiers.
- Real email, calendar, financial, health, message, or location data.
- Autonomous or consequential actions.
- Deployment to the accepted production site.

## Local review

Serve the repository root with a local static server and open:

`/src/aegis-synthetic-coach/`

The prototype should not be opened with production data. Reloading the page resets its permissions and audit history.
