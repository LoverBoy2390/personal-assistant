# AEGIS iOS Bridge v0.5.0 — Approval Package

This draft package wraps the accepted AEGIS LifeOS v0.4.1 interface in a native SwiftUI/WKWebView shell and adds a deliberately narrow Apple Calendar and Reminders bridge.

## Approval boundary

- Apple Calendar and Reminders are read-only by implementation.
- Apple does not provide read-only authorization; iOS displays **Full Access** because reading requires it.
- The bridge contains no create, edit, complete, move, or delete commands.
- Calendar/reminder contents remain on-device.
- Local audit entries record permission actions and counts, not event titles.
- External links open in the system browser.
- HealthKit, HomeKit, Siri/App Intents, cloud sync, remote AI transmission, analytics, and background monitoring are excluded.
- The accepted v0.4.1 web interface is embedded without redesign.

## Package reconstruction

```bash
cat parts/part-*.b64 | base64 --decode > AEGIS-iOS-Bridge-v0.5.0-Approval.zip
sha256sum --check SHA256SUMS.txt
unzip AEGIS-iOS-Bridge-v0.5.0-Approval.zip
cd AEGIS-iOS-Bridge-v0.5.0-Approval
python3 Scripts/verify_ios_bridge.py
```

The verified package SHA-256 is:

`c4145e344a7e9b4ac98d646a92ef0db900a42875f0f8ae50516a1cce2bcd89fd`

This remains a draft until the user approves the interface and permission boundary. It is source-complete but not a signed `.ipa`; Apple signing requires macOS and Xcode or an authorized Apple CI service.
