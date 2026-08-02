import test from 'node:test';
import assert from 'node:assert/strict';
import { ProtectedBackendKernel } from '../src/aegis-protected-backend/security-core.mjs';
import { createProtectedServer } from '../src/aegis-protected-backend/server.mjs';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function json(response) {
  const body = await response.json();
  return { response, body };
}

test('loopback synthetic API enforces session, storage, export, refresh, and revocation contracts', async (t) => {
  const kernel = new ProtectedBackendKernel({ syntheticIdentityEnabled: true });
  const server = createProtectedServer({ kernel, syntheticTestMode: true });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = await listen(server);

  let result = await json(await fetch(`${origin}/health`));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.connectors, 0);
  assert.equal(result.response.headers.get('cache-control'), 'no-store');

  result = await json(await fetch(`${origin}/v1/test/enrollment/start`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ alias: 'Synthetic HTTP User', deviceLabel: 'HTTP test device' })
  }));
  assert.equal(result.response.status, 201);
  const challengeId = result.body.challengeId;

  result = await json(await fetch(`${origin}/v1/test/enrollment/finish`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId, credentialId: 'http-synthetic-credential-00000001' })
  }));
  assert.equal(result.response.status, 201);
  const { accessToken, refreshToken } = result.body.session;
  const deviceId = result.body.device.deviceId;
  const auth = { authorization: `Bearer ${accessToken}` };

  result = await json(await fetch(`${origin}/v1/me`, { headers: auth }));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.synthetic, true);

  const put = await fetch(`${origin}/v1/data/demo`, {
    method: 'PUT', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ value: { synthetic: true, title: 'HTTP protected record' } })
  });
  assert.equal(put.status, 204);

  result = await json(await fetch(`${origin}/v1/data/demo`, { headers: auth }));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.title, 'HTTP protected record');

  result = await json(await fetch(`${origin}/v1/export`, { headers: auth }));
  assert.equal(result.response.status, 200);
  assert.equal(result.body.records.length, 1);

  result = await json(await fetch(`${origin}/v1/session/refresh`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  }));
  assert.equal(result.response.status, 200);
  assert.notEqual(result.body.refreshToken, refreshToken);

  const replay = await fetch(`${origin}/v1/session/refresh`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  assert.equal(replay.status, 401);

  result = await json(await fetch(`${origin}/v1/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE', headers: auth
  }));
  assert.equal(result.response.status, 200);
  assert.ok(result.body.revokedAt);

  const afterRevoke = await fetch(`${origin}/v1/me`, { headers: auth });
  assert.equal(afterRevoke.status, 401);
});

test('non-test HTTP is rejected without trusted TLS termination', async (t) => {
  const server = createProtectedServer({
    kernel: new ProtectedBackendKernel({ syntheticIdentityEnabled: false }),
    syntheticTestMode: false
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = await listen(server);
  const response = await fetch(`${origin}/health`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Secure transport required' });
});
