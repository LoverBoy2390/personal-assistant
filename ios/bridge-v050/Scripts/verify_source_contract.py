#!/usr/bin/env python3
from pathlib import Path
import plistlib, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
SOURCES = sorted((ROOT / 'AEGISLifeOS' / 'Sources').glob('*.swift'))
combined = '\n'.join(path.read_text(encoding='utf-8') for path in SOURCES)
errors = []

required = [
    'requestFullAccessToEvents',
    'requestFullAccessToReminders',
    'predicateForEvents',
    'fetchReminders',
    'WKScriptMessageHandler',
    'Unsupported read-only bridge command',
    '0.5.0-approval',
]
for marker in required:
    if marker not in combined:
        errors.append(f'missing marker: {marker}')

for prohibited in [
    r'(^|[^A-Za-z])(store|eventStore)\s*\.\s*(save|remove)\s*\(',
    r'EKEventEditViewController',
    r'URLSession',
    r'NWConnection',
    r'CKContainer',
    r'CloudKit',
]:
    if re.search(prohibited, combined):
        errors.append(f'prohibited capability present: {prohibited}')

info = plistlib.loads((ROOT / 'AEGISLifeOS' / 'Info.plist').read_bytes())
for key in ['NSCalendarsFullAccessUsageDescription', 'NSRemindersFullAccessUsageDescription']:
    if key not in info or 'read-only' not in info[key].lower():
        errors.append(f'invalid or missing {key}')

privacy = plistlib.loads((ROOT / 'AEGISLifeOS' / 'Resources' / 'PrivacyInfo.xcprivacy').read_bytes())
if privacy.get('NSPrivacyTracking') is not False:
    errors.append('privacy manifest must declare no tracking')
if privacy.get('NSPrivacyCollectedDataTypes') != []:
    errors.append('approval build must declare no off-device data collection')

for source in SOURCES:
    result = subprocess.run(['swiftc', '-frontend', '-parse', str(source)], capture_output=True, text=True)
    if result.returncode:
        errors.append(f'Swift parse failed: {source.name}: {result.stderr.strip()}')

if errors:
    print('\n'.join(f'ERROR: {error}' for error in errors))
    sys.exit(1)

print(f'AEGIS iOS source contract passed: {len(SOURCES)} Swift files')
