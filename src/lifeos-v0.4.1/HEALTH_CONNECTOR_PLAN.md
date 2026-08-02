# AEGIS Health Connector Plan

## Current v0.3 capability
- Manual wake-health entries stored inside the encrypted local vault.
- Local JSON import.
- Transparent sleep/readiness score.
- Dream voice capture where the browser supports speech recognition.
- No wearable is falsely marked connected.

## Native iPhone path
A native iOS companion app is required for Apple Health/Apple Watch data. It should:
1. Request read-only HealthKit authorization for sleep analysis, heart rate, resting heart rate, HRV (SDNN), respiratory rate, and oxygen saturation.
2. Normalize the latest post-sleep readings into the AEGIS health schema.
3. Send them only to the user's local AEGIS instance or encrypt them locally before any configured sync.
4. Show each authorized category and provide a revoke/disconnect path.
5. Never infer a medical diagnosis from the data.

## Android path
Use Health Connect for sleep sessions, heart-rate records, resting heart rate, oxygen saturation, and other permitted vital records. Use background reads only after explicit permission.

## Provider paths
- Garmin Health API / Companion SDK for sleep, stress, heart rate, and live sensor streams.
- Oura API for sleep and readiness data.
- Fitbit Web API as a later provider-specific connector.

## Security gates
- Read-only by default.
- Minimum requested scopes.
- Tokens stored outside the browser vault in platform secure storage.
- Visible last-sync time and source provenance.
- No third-party sharing without a separate, explicit approval.
- Disconnect deletes tokens and stops background sync.
