# AEGIS iOS Bridge v0.5.0 — Approval Record

This draft wraps the accepted AEGIS LifeOS v0.4.1 interface in a native SwiftUI/WKWebView shell and adds a deliberately narrow Apple Calendar and Reminders bridge.

The reviewable Swift source is stored in `ios/bridge-v050/`. The complete source package delivered to the user also includes the locked v0.4.1 web assets, generated Xcode project, app icon, approval preview, build instructions, and full verification manifest.

## Approval boundary

- Apple Calendar and Reminders are read-only by implementation.
- Apple does not provide read-only authorization; iOS displays **Full Access** because reading requires it.
- The bridge contains no create, edit, complete, move, or delete commands.
- Calendar/reminder contents remain on-device.
- Local audit entries record permission actions and counts, not event titles.
- External links open in the system browser.
- HealthKit, HomeKit, Siri/App Intents, cloud sync, remote AI transmission, analytics, and background monitoring are excluded.
- The accepted v0.4.1 web interface is embedded without redesign.

The complete verified package SHA-256 is:

`c4145e344a7e9b4ac98d646a92ef0db900a42875f0f8ae50516a1cce2bcd89fd`

This remains a draft until the user approves the interface and permission boundary. It is source-complete but not a signed `.ipa`; Apple signing requires macOS and Xcode or an authorized Apple CI service.
