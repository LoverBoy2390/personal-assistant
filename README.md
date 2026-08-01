# AEGIS Dashboard RC1.2

Zero-dependency, local-first dashboard foundation for AEGIS LifeOS.

## Open locally
Open `index.html` directly for a basic desktop preview. Service workers and install/offline support require HTTPS or a local web server.

## Install on iPhone
1. Open the deployed AEGIS URL in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.

## Included
- Aurora Frost responsive dashboard
- Desktop and phone navigation
- Persistent local task state
- Search/filter behavior
- Real local interface diagnostics with explicit limits
- Background-resilient 20-minute timer
- PWA manifest, AEGIS app icon metadata, service worker, and offline fallback
- GitHub Pages deployment workflow
- Honest labels for demo and disconnected data
- No autonomous actions

## Validation performed
- JavaScript syntax checks for the app and service worker
- Manifest JSON parsing and icon markup checks
- Local static HTTP launch and required asset requests
- Service-worker asset list verification
- ZIP integrity verification

## Not yet implemented
Live AI, financial sync, PC scanning, voice control, Alexa, smart-home control, wearables, audit logging, authentication, secure backend storage, and external data integrations.
