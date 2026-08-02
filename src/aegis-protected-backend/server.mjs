import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { ProtectedBackendKernel, transportAllowed } from './security-core.mjs';

const MAX_BODY_BYTES = 64 * 1024;

function securityHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}

function reply(response, status, payload) {
  securityHeaders(response);
  response.statusCode = status;
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body exceeds 64 KB');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body is not valid JSON');
  }
}

function bearer(request) {
  const value = request.headers.authorization || '';
  if (!value.startsWith('Bearer ')) throw new Error('Bearer access token required');
  return value.slice(7);
}

function routeId(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const value = decodeURIComponent(pathname.slice(prefix.length));
  if (!value || value.length > 120 || value.includes('/')) throw new Error('Invalid route identifier');
  return value;
}

export function createProtectedServer({
  kernel = new ProtectedBackendKernel({ syntheticIdentityEnabled: true }),
  syntheticTestMode = false,
  trustForwardedProto = false
} = {}) {
  return http.createServer(async (request, response) => {
    try {
      const remoteAddress = request.socket.remoteAddress || '';
      if (!transportAllowed({
        encrypted: Boolean(request.socket.encrypted),
        forwardedProto: request.headers['x-forwarded-proto'] || '',
        remoteAddress,
        syntheticTestMode,
        trustedProxy: trustForwardedProto
      })) {
        return reply(response, 400, { error: 'Secure transport required' });
      }

      const url = new URL(request.url, 'http://aegis.invalid');
      const { pathname } = url;

      if (request.method === 'GET' && pathname === '/health') {
        return reply(response, 200, {
          ok: true,
          mode: syntheticTestMode ? 'synthetic-test-only' : 'protected',
          connectors: 0,
          productionReady: false
        });
      }

      if (request.method === 'POST' && pathname === '/v1/test/enrollment/start') {
        if (!syntheticTestMode) return reply(response, 404, { error: 'Not found' });
        const body = await readJson(request);
        return reply(response, 201, kernel.identity.beginEnrollment(body.alias, body.deviceLabel));
      }

      if (request.method === 'POST' && pathname === '/v1/test/enrollment/finish') {
        if (!syntheticTestMode) return reply(response, 404, { error: 'Not found' });
        const body = await readJson(request);
        const result = kernel.completeSyntheticEnrollment(body.challengeId, body.credentialId);
        return reply(response, 201, result);
      }

      if (request.method === 'POST' && pathname === '/v1/session/refresh') {
        const body = await readJson(request);
        return reply(response, 200, kernel.sessions.rotate(body.refreshToken));
      }

      if (request.method === 'GET' && pathname === '/v1/me') {
        const session = kernel.authorize(bearer(request));
        return reply(response, 200, {
          synthetic: true,
          subjectHash: kernel.subjectHash(session.sub),
          deviceId: session.deviceId,
          scopes: session.scopes,
          accessExpiresAt: new Date(session.exp).toISOString()
        });
      }

      const dataId = routeId(pathname, '/v1/data/');
      if (dataId && request.method === 'PUT') {
        const body = await readJson(request);
        await kernel.putRecord(bearer(request), dataId, body.value, { expiresAt: body.expiresAt || null });
        return reply(response, 204, {});
      }
      if (dataId && request.method === 'GET') {
        const value = await kernel.getRecord(bearer(request), dataId);
        return reply(response, value ? 200 : 404, value || { error: 'Not found' });
      }

      const deviceId = routeId(pathname, '/v1/devices/');
      if (deviceId && request.method === 'DELETE') {
        const device = kernel.revokeDevice(bearer(request), deviceId);
        return reply(response, 200, { deviceId: device.deviceId, revokedAt: device.revokedAt });
      }

      if (request.method === 'GET' && pathname === '/v1/export') {
        return reply(response, 200, await kernel.exportUser(bearer(request)));
      }

      if (request.method === 'POST' && pathname === '/v1/backup') {
        return reply(response, 201, await kernel.createBackup(bearer(request)));
      }

      if (request.method === 'POST' && pathname === '/v1/restore') {
        const body = await readJson(request);
        await kernel.restoreBackup(bearer(request), body.backup);
        return reply(response, 200, { restored: true });
      }

      if (request.method === 'DELETE' && pathname === '/v1/account') {
        kernel.deleteAccount(bearer(request));
        return reply(response, 200, { deleted: true });
      }

      return reply(response, 404, { error: 'Not found' });
    } catch (error) {
      const message = error?.message || 'Request failed';
      const unauthorized = /token|scope|access denied|Device is revoked|Bearer/i.test(message);
      return reply(response, unauthorized ? 401 : 400, { error: message });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const syntheticTestMode = process.env.AEGIS_SYNTHETIC_TEST_MODE === '1';
  const host = process.env.AEGIS_HOST || '127.0.0.1';
  const port = Number(process.env.AEGIS_PORT || 8787);
  if (syntheticTestMode && !['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('Synthetic test server may bind only to loopback');
  }
  const kernel = new ProtectedBackendKernel({ syntheticIdentityEnabled: syntheticTestMode });
  createProtectedServer({ kernel, syntheticTestMode }).listen(port, host, () => {
    console.log(JSON.stringify({ service: 'aegis-protected-backend', host, port, syntheticTestMode, connectors: 0 }));
  });
}
