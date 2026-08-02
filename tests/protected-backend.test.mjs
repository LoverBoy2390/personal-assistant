import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ProtectedBackendKernel,
  transportAllowed
} from '../src/aegis-protected-backend/security-core.mjs';

function fixture() {
  let current = Date.parse('2026-08-02T18:00:00.000Z');
  const now = () => current;
  const kernel = new ProtectedBackendKernel({ now, syntheticIdentityEnabled: true });
  function advance(ms) { current += ms; }
  function enroll(alias = 'Synthetic Alpha', deviceLabel = 'Test device') {
    const challenge = kernel.identity.beginEnrollment(alias, deviceLabel);
    return kernel.completeSyntheticEnrollment(challenge.challengeId, `credential-${alias}-0000000000000000`);
  }
  return { kernel, advance, enroll, now };
}

test('synthetic identity adapter is disabled unless explicitly enabled', () => {
  const kernel = new ProtectedBackendKernel();
  assert.throws(() => kernel.identity.beginEnrollment('x', 'y'), /disabled/);
});

test('enrollment challenge expires and cannot be replayed', () => {
  const { kernel, advance } = fixture();
  const challenge = kernel.identity.beginEnrollment('Synthetic Alpha', 'Test device');
  advance(120001);
  assert.throws(() => kernel.completeSyntheticEnrollment(challenge.challengeId, 'credential-0000000000000000'), /expired/);
  assert.throws(() => kernel.completeSyntheticEnrollment(challenge.challengeId, 'credential-0000000000000000'), /expired/);
});

test('access sessions are short-lived and scope checked', () => {
  const { kernel, advance, enroll } = fixture();
  const user = enroll();
  const session = kernel.authorize(user.session.accessToken, ['data:read']);
  assert.equal(session.sub, user.user.userId);
  assert.throws(() => kernel.authorize(user.session.accessToken, ['connector:write']), /Missing scope/);
  advance(120001);
  assert.throws(() => kernel.authorize(user.session.accessToken), /expired/);
});

test('refresh tokens rotate and replay revokes the entire family', () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  const rotated = kernel.sessions.rotate(user.session.refreshToken);
  assert.notEqual(rotated.refreshToken, user.session.refreshToken);
  assert.throws(() => kernel.sessions.rotate(user.session.refreshToken), /replay detected/);
  assert.throws(() => kernel.sessions.rotate(rotated.refreshToken), /family revoked/);
});

test('device revocation invalidates access and refresh sessions', () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  kernel.revokeDevice(user.session.accessToken, user.device.deviceId);
  assert.throws(() => kernel.authorize(user.session.accessToken), /Device is revoked/);
  assert.throws(() => kernel.sessions.rotate(user.session.refreshToken), /revoked/);
});

test('authorization matrix prevents cross-user reads', async () => {
  const { kernel, enroll } = fixture();
  const alpha = enroll('Synthetic Alpha');
  const beta = enroll('Synthetic Beta');
  await kernel.putRecord(alpha.session.accessToken, 'plan', { synthetic: true, title: 'Alpha plan' });
  assert.deepEqual(await kernel.getRecord(alpha.session.accessToken, 'plan'), { synthetic: true, title: 'Alpha plan' });
  await assert.rejects(
    () => kernel.getRecordForOwner(beta.session.accessToken, alpha.user.userId, 'plan'),
    /Cross-user access denied/
  );
});

test('data and token stores remain opaque and use separate key purposes', async () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  await kernel.putRecord(user.session.accessToken, 'profile', { synthetic: true, secretLabel: 'synthetic-profile-value' });
  await kernel.tokenVault.put(user.user.userId, 'sandbox-token', { synthetic: true, tokenLabel: 'synthetic-token-value' });
  const dataRaw = kernel.data.raw(user.user.userId, 'profile');
  const tokenRaw = kernel.tokenVault.raw(user.user.userId, 'sandbox-token');
  assert.equal(JSON.stringify(dataRaw).includes('synthetic-profile-value'), false);
  assert.equal(JSON.stringify(tokenRaw).includes('synthetic-token-value'), false);
  assert.equal(dataRaw.wrappedDek.purpose, 'data');
  assert.equal(tokenRaw.wrappedDek.purpose, 'token');
  assert.notEqual(dataRaw.wrappedDek.kid, tokenRaw.wrappedDek.kid);
});

test('key rotation rewraps data keys without losing records', async () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  await kernel.putRecord(user.session.accessToken, 'rotation', { synthetic: true, value: 7 });
  const before = kernel.data.raw(user.user.userId, 'rotation').wrappedDek.kid;
  const active = kernel.keys.rotate('data');
  await kernel.data.rewrapAll();
  const after = kernel.data.raw(user.user.userId, 'rotation').wrappedDek.kid;
  assert.notEqual(before, after);
  assert.equal(after, active);
  assert.deepEqual(await kernel.getRecord(user.session.accessToken, 'rotation'), { synthetic: true, value: 7 });
});

test('tamper-evident audit chain detects alteration', () => {
  const { kernel, enroll } = fixture();
  enroll();
  assert.equal(kernel.audit.verify(), true);
  const tampered = kernel.audit.entries.map((entry) => ({ ...entry }));
  tampered[0].result = 'changed';
  assert.equal(kernel.audit.verify(tampered), false);
});

test('encrypted backup restores records after validated recovery', async () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  await kernel.putRecord(user.session.accessToken, 'recover', { synthetic: true, value: 'recoverable' });
  const backup = await kernel.createBackup(user.session.accessToken);
  kernel.data.deleteUser(user.user.userId);
  assert.equal(await kernel.getRecord(user.session.accessToken, 'recover'), null);
  await kernel.restoreBackup(user.session.accessToken, backup);
  assert.deepEqual(await kernel.getRecord(user.session.accessToken, 'recover'), { synthetic: true, value: 'recoverable' });
  const corrupted = { ...backup, ciphertext: `${backup.ciphertext.slice(0, -2)}aa` };
  await assert.rejects(() => kernel.restoreBackup(user.session.accessToken, corrupted), /decryption failed/);
});

test('retention purge permanently removes expired encrypted records', async () => {
  const { kernel, advance, enroll } = fixture();
  const user = enroll();
  const expiresAt = new Date(Date.parse('2026-08-02T18:00:01.000Z')).toISOString();
  await kernel.putRecord(user.session.accessToken, 'temporary', { synthetic: true, value: 'short-lived' }, { expiresAt });
  advance(1001);
  assert.equal(kernel.data.purgeExpired(), 1);
  assert.equal(await kernel.getRecord(user.session.accessToken, 'temporary'), null);
});

test('export omits credential hashes and account deletion removes user state', async () => {
  const { kernel, enroll } = fixture();
  const user = enroll();
  await kernel.putRecord(user.session.accessToken, 'exported', { synthetic: true, value: 'included' });
  const exported = await kernel.exportUser(user.session.accessToken);
  assert.equal(exported.synthetic, true);
  assert.equal(JSON.stringify(exported).includes('credentialHash'), false);
  kernel.deleteAccount(user.session.accessToken);
  assert.equal(kernel.identity.getUser(user.user.userId), null);
  assert.equal(kernel.devices.list(user.user.userId).length, 0);
  assert.equal(kernel.data.raw(user.user.userId, 'exported'), null);
  assert.throws(() => kernel.authorize(user.session.accessToken), /Unknown|Invalid|revoked|Device/);
  assert.equal(kernel.audit.verify(), true);
});

test('transport policy allows TLS and loopback-only synthetic HTTP', () => {
  assert.equal(transportAllowed({ encrypted: true, remoteAddress: '203.0.113.10' }), true);
  assert.equal(transportAllowed({ forwardedProto: 'https', remoteAddress: '203.0.113.10' }), false);
  assert.equal(transportAllowed({ forwardedProto: 'https', remoteAddress: '203.0.113.10', trustedProxy: true }), true);
  assert.equal(transportAllowed({ remoteAddress: '127.0.0.1', syntheticTestMode: true }), true);
  assert.equal(transportAllowed({ remoteAddress: '203.0.113.10', syntheticTestMode: true }), false);
  assert.equal(transportAllowed({ remoteAddress: '127.0.0.1', syntheticTestMode: false }), false);
});
