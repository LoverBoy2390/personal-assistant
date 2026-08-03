import assert from 'node:assert/strict';

const devtools = process.env.AEGIS_CDP || 'http://127.0.0.1:9223';
const targetUrl = process.env.AEGIS_URL || 'http://127.0.0.1:8765/src/aegis-champion/';
const expectedCache = process.env.AEGIS_EXPECTED_CACHE || 'aegis-champion-local-v1';
const diagnostics = { stage: 'initializing', console: [], exceptions: [], requests: [] };
const overallTimeout = setTimeout(() => {
  console.error(JSON.stringify({ ...diagnostics, error: 'Champion browser smoke exceeded 90 seconds' }, null, 2));
  process.exit(124);
}, 90000);

async function waitForJson(url, options) {
  let last;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      last = new Error(`HTTP ${response.status}`);
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw last || new Error(`Unable to reach ${url}`);
}

const target = await waitForJson(`${devtools}/json/new?about%3Ablank`, { method: 'PUT' });
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let messageId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const entry = pending.get(message.id);
    clearTimeout(entry.timer);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
    return;
  }
  if (message.method === 'Network.requestWillBeSent') diagnostics.requests.push(message.params.request.url);
  if (message.method === 'Runtime.consoleAPICalled') diagnostics.console.push({
    type: message.params.type,
    values: message.params.args.map((item) => item.value ?? item.description ?? item.type)
  });
  if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push({
    text: message.params.exceptionDetails.text,
    description: message.params.exceptionDetails.exception?.description || null
  });
});

function send(method, params = {}, timeoutMs = 30000) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP command timed out during ${diagnostics.stage}: ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });
}

async function evaluate(expression, label = 'evaluation') {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || label;
    throw new Error(`${label}: ${detail}`);
  }
  return result.result.value;
}

async function waitExpression(expression, label, expected = true, attempts = 180) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await evaluate(expression, `${label} poll ${attempt + 1}`);
    if (value === expected) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition did not become ${expected}: ${label}`);
}

try {
  diagnostics.stage = 'enable browser domains';
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');

  diagnostics.stage = 'navigate to Champion';
  const navigation = await send('Page.navigate', { url: targetUrl });
  if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
  await waitExpression('document.readyState === "complete"', 'document complete');
  await waitExpression('window.__AEGIS_CHAMPION_READY__ === true', 'Champion module ready');

  diagnostics.stage = 'verify visible safety contract';
  const visible = await evaluate(`({
    title: document.title,
    text: document.body.innerText,
    systemButton: Boolean(document.querySelector('[data-view="system"]')),
    vaultButton: Boolean(document.querySelector('[data-view="vault"]'))
  })`, 'visible Champion state');
  assert.equal(visible.title, 'AEGIS Champion Local Core');
  assert.equal(visible.systemButton, true);
  assert.equal(visible.vaultButton, true);
  for (const marker of [
    'LOCAL-ONLY · SYNTHETIC DATA',
    'External accounts',
    '0 connected',
    '$0 enabled',
    'Cloud synchronization',
    'Good morning, Champion.'
  ]) assert.ok(visible.text.includes(marker), `Missing visible marker: ${marker}`);

  diagnostics.stage = 'verify system view';
  await evaluate(`document.querySelector('[data-view="system"]').click()`, 'open system view');
  await waitExpression(`!document.querySelector('#system-view').hidden`, 'system view visible');
  const systemText = await evaluate(`document.querySelector('#system-view').innerText`, 'system text');
  for (const marker of ['External network disabled', 'No AWS runtime', 'No real accounts', 'No consequential actions']) {
    assert.ok(systemText.includes(marker), `Missing system boundary: ${marker}`);
  }

  diagnostics.stage = 'verify service worker and cache';
  await waitExpression(`window.__AEGIS_SW_STATE__?.status === 'registered'`, 'service worker registered', true, 260);
  const cachesState = await evaluate(`
    (async () => {
      const result = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        result.push({ name, urls: (await cache.keys()).map((request) => request.url) });
      }
      return result;
    })()
  `, 'cache inspection');
  assert.ok(cachesState.some((cache) => cache.name === expectedCache), `Missing cache ${expectedCache}`);
  const cachedUrls = cachesState.flatMap((cache) => cache.urls);
  assert.equal(cachedUrls.some((url) => url.includes('/api/')), false);
  assert.equal(cachedUrls.some((url) => new URL(url).origin !== new URL(targetUrl).origin), false);

  diagnostics.stage = 'verify zero external requests';
  const external = diagnostics.requests.filter((url) => {
    try {
      return !url.startsWith('devtools://') && new URL(url).origin !== new URL(targetUrl).origin;
    } catch {
      return false;
    }
  });
  assert.deepEqual(external, []);
  assert.deepEqual(diagnostics.exceptions, []);

  console.log(JSON.stringify({
    championReady: true,
    visibleBoundaries: true,
    systemView: true,
    serviceWorkerCache: expectedCache,
    externalRequests: external,
    exceptions: diagnostics.exceptions
  }, null, 2));
} catch (error) {
  diagnostics.error = error.message;
  console.error(JSON.stringify(diagnostics, null, 2));
  process.exitCode = 1;
} finally {
  clearTimeout(overallTimeout);
  for (const entry of pending.values()) clearTimeout(entry.timer);
  pending.clear();
  socket.close();
}
