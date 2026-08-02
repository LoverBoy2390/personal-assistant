import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSyntheticPayload,
  createEncryptedEnvelope,
  createLockController,
  decryptEnvelope,
  exportEncryptedBackup,
  lifecycleLockReason,
  parseEncryptedBackup,
  replaceEncryptedPayload,
  restoreWithRollback
} from '../src/aegis-synthetic-coach/vault-core.mjs';

const passphrase = 'synthetic-only-passphrase';
const payload = { synthetic: true, permissions: { calendar: true }, corrections: [] };
const fast = { iterations: 10000, now: '2026-08-02T16:00:00.000Z' };

test('rejects non-synthetic payloads', () => {
  assert.throws(() => assertSyntheticPayload({ synthetic: false }), /synthetic=true/);
});

test('creates opaque authenticated envelope and unlocks it', async () => {
  const envelope = await createEncryptedEnvelope(passphrase, payload, fast);
  assert.equal(envelope.format, 'aegis-synthetic-vault/v1');
  assert.equal(JSON.stringify(envelope).includes('calendar'), false);
  assert.deepEqual(await decryptEnvelope(passphrase, envelope), payload);
});

test('wrong passphrase cannot unlock', async () => {
  const envelope = await createEncryptedEnvelope(passphrase, payload, fast);
  await assert.rejects(() => decryptEnvelope('wrong-passphrase-123', envelope), /unlock failed/);
});

test('replacement rotates metadata and increments revision', async () => {
  const first = await createEncryptedEnvelope(passphrase, payload, fast);
  const nextPayload = { ...payload, corrections: [{ targetId: 'task-1', verdict: 'needs-correction' }] };
  const second = await replaceEncryptedPayload(passphrase, first, nextPayload, { now: '2026-08-02T16:10:00.000Z' });
  assert.equal(second.revision, 2);
  assert.notEqual(second.kdf.salt, first.kdf.salt);
  assert.notEqual(second.cipher.iv, first.cipher.iv);
  assert.deepEqual(await decryptEnvelope(passphrase, second), nextPayload);
});

test('encrypted backup verifies and restores', async () => {
  const envelope = await createEncryptedEnvelope(passphrase, payload, fast);
  const backup = await exportEncryptedBackup(envelope);
  const parsed = await parseEncryptedBackup(backup, passphrase);
  assert.deepEqual(parsed.payload, payload);
});

test('corrupt backup preserves rollback envelope', async () => {
  const envelope = await createEncryptedEnvelope(passphrase, payload, fast);
  const backup = await exportEncryptedBackup(envelope);
  const corrupt = backup.replace('SHA-256', 'SHA-25X');
  const result = await restoreWithRollback({ currentEnvelope: envelope, backupText: corrupt, passphrase });
  assert.equal(result.ok, false);
  assert.deepEqual(result.activeEnvelope, envelope);
  assert.deepEqual(result.rollbackEnvelope, envelope);
});

test('lock controller enforces inactivity timeout', () => {
  let now = 1000;
  const controller = createLockController({ timeoutMs: 500, clock: () => now });
  controller.unlock();
  now = 1499;
  assert.equal(controller.check(), true);
  now = 1500;
  assert.equal(controller.check(), false);
  assert.equal(controller.status().reason, 'timeout');
});

test('lifecycle events map to mandatory lock reasons', () => {
  assert.equal(lifecycleLockReason('pagehide'), 'page-exit');
  assert.equal(lifecycleLockReason('visibility-hidden'), 'page-hidden');
  assert.equal(lifecycleLockReason('pageshow', true), 'bfcache-restore');
  assert.equal(lifecycleLockReason('broadcast-lock'), 'another-tab');
  assert.equal(lifecycleLockReason('pageshow', false), null);
});
