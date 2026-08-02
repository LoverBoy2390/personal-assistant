# AEGIS LifeOS v0.4 Architecture

## Surface layer

The interface exposes four primary areas:

1. **Home** — one Best Next Action, readiness, critical items, and verified connection count.
2. **Workspace** — selected app windows, public current events, and the local AEGIS assistant.
3. **AEGIS** — missions, memory, decisions, performance, relationships, and projects.
4. **System** — permissions, verified connection states, audit history, settings, and backups.

## Private state layer

- Browser state is serialized to JSON.
- A key is derived from the user's passphrase with PBKDF2-SHA-256.
- The serialized state is encrypted with AES-GCM before browser storage.
- Existing v0.1 storage keys and vault format are preserved for migration.

## Local service layer

`server.py` provides:

- static application hosting on `127.0.0.1:8787`;
- `/api/health` for runtime verification;
- `/api/news` for allowlisted public RSS aggregation;
- ten-minute in-memory headline caching;
- security headers and a restrictive content-security policy.

## Connection contract for future adapters

A real provider adapter must expose:

- connection state: `not_connected`, `connecting`, `connected`, `degraded`, or `revoked`;
- exact authorized scopes;
- last successful synchronization time;
- what data was read, written, or transmitted;
- a revoke and deletion path;
- token storage method;
- audit entries for access and actions;
- approval gates for consequential writes.

A permission toggle cannot set connection state. Only a completed, verified provider handshake may do that.

## Display and glasses layer

Glance Mode is a responsive, high-contrast display profile. It does not expose camera, microphone, sensors, spatial anchors, or device control. Those require a separate hardware adapter and device-specific testing.
