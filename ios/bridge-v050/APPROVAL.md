# AEGIS iOS Bridge v0.5.0 — Approval Gate

Approve or reject these decisions:

1. The accepted AEGIS LifeOS v0.4.1 interface remains embedded without redesign.
2. A small native **Apple** button opens the Apple Connections sheet.
3. Calendar and Reminders are read-only by implementation, even though iOS labels the required permission **Full Access**.
4. The bridge exposes only four commands: status, request Calendar, request Reminders, and read an agenda preview.
5. No Calendar or Reminders create, edit, complete, move, or delete functions are included.
6. Calendar and reminder contents remain on-device. Audit entries record actions and counts, not event titles.
7. External links leave AEGIS and open in the system browser.
8. HealthKit, HomeKit, Siri/App Intents, cloud synchronization, remote AI transmission, analytics, and background monitoring remain excluded.

Approval outcome:

- [ ] Approve this boundary for a signed iPhone beta.
- [ ] Approve with requested changes.
- [ ] Reject and return to design.
