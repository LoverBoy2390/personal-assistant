import assert from 'node:assert/strict';

const devtools = process.env.AEGIS_CDP || 'http://127.0.0.1:9222';
const targetUrl = process.env.AEGIS_URL || 'http://127.0.0.1:8765/src/aegis-synthetic-coach/';

async function waitForJson(url, options) {
  let last;
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      last = new Error(`HTTP ${response.status}`);
    } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw last || new Error(`Unable to reach ${url}`);
}

const target = await waitForJson(`${devtools}/json/new?about%3Ablank`, { method: 'PUT' });
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const requests = [];
let messageId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    return;
  }
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
});

function send(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function waitExpression(expression, expected = true) {
  for (let i = 0; i < 100; i += 1) {
    const value = await evaluate(expression);
    if (value === expected) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition did not become ${expected}: ${expression}`);
}

await send('Runtime.enable');
await send('Network.enable');
await send('Page.enable');
await send('Page.navigate', { url: targetUrl });
await waitExpression('window.__AEGIS_VAULT_READY__ === true');

await evaluate(`document.querySelector('[data-view="vault"]').click()`);
await waitExpression(`!document.querySelector('#vault-view').hidden`);
await evaluate(`
  document.querySelector('#new-passphrase').value = 'synthetic-vault-passphrase';
  document.querySelector('#confirm-passphrase').value = 'synthetic-vault-passphrase';
  document.querySelector('#create-vault-form').requestSubmit();
`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'unlocked'`);
const rawEnvelope = await evaluate(`window.__AEGIS_VAULT_TEST__.rawEnvelopeText()`);
assert.equal(rawEnvelope.includes('preferences'), false);
assert.equal(rawEnvelope.includes('calendar'), false);

await evaluate(`window.__AEGIS_VAULT_TEST__.lock('browser-test')`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`);
await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'unlocked'`);

await evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`);
await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`);
await evaluate(`window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`);

await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`);
await evaluate(`
  (() => {
    const channel = new BroadcastChannel(window.__AEGIS_VAULT_TEST__.storageInfo.channel);
    channel.postMessage({ type: 'lock', reason: 'browser-test' });
    setTimeout(() => channel.close(), 20);
  })()
`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`);

const cacheState = await evaluate(`
  (async () => {
    await navigator.serviceWorker.ready;
    const names = await caches.keys();
    const entries = [];
    for (const name of names) {
      const cache = await caches.open(name);
      entries.push({ name, urls: (await cache.keys()).map((request) => request.url) });
    }
    return entries;
  })()
`);
assert.ok(cacheState.some((cache) => cache.name === 'aegis-synthetic-static-v2'));
assert.equal(cacheState.flatMap((cache) => cache.urls).some((url) => url.includes('/api/')), false);

const external = requests.filter((url) => {
  try { return new URL(url).origin !== new URL(targetUrl).origin && !url.startsWith('devtools://'); }
  catch { return false; }
});
assert.deepEqual(external, []);

await evaluate(`window.__AEGIS_VAULT_TEST__.delete()`);
await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'not-created'`);

console.log(JSON.stringify({
  vaultLifecycle: 'passed',
  encryptedAtRest: 'checked',
  pageExitLock: 'passed',
  bfcacheLock: 'passed',
  broadcastLock: 'passed',
  serviceWorkerCache: cacheState,
  externalRequests: external
}, null, 2));
socket.close();
