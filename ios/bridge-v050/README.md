# AEGIS iOS Bridge v0.5.0 — Approval Source

This draft wraps the accepted AEGIS LifeOS v0.4.1 interface in a native SwiftUI/WKWebView shell and adds a narrow Apple Calendar and Reminders bridge.

## Approval boundary

- Calendar and Reminders are read-only by implementation.
- Apple does not offer read-only authorization; iOS displays **Full Access** because reading requires it.
- The bridge exposes only status, permission requests, and agenda reads.
- No create, edit, complete, move, or delete functions are included.
- Calendar and reminder contents remain on-device.
- Local audit entries record actions and counts, not event titles.
- Native networking, CloudKit, analytics, HealthKit, HomeKit, Siri/App Intents, background monitoring, and remote AI transmission are excluded.
- The accepted v0.4.1 web application remains the interface baseline; the complete approval ZIP embeds those locked assets.

## Verification

Run:

```bash
python3 Scripts/verify_source_contract.py
```

The complete approval package delivered to the user has SHA-256:

`c4145e344a7e9b4ac98d646a92ef0db900a42875f0f8ae50516a1cce2bcd89fd`

This PR must remain a draft until the user approves the permission language and interface. It is not a signed `.ipa`; signing and device compilation require macOS with Xcode or an authorized Apple CI service.
