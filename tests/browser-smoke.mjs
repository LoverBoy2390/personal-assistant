import assert from 'node:assert/strict';

const devtools = process.env.AEGIS_CDP || 'http://127.0.0.1:9222';
const targetUrl = process.env.AEGIS_URL || 'http://127.0.0.1:8765/src/aegis-synthetic-coach/';
const diagnostics = { stage: 'initializing', console: [], exceptions: [], loadingFailures: [] };
const overallTimeout = setTimeout(() => {
  console.error(JSON.stringify({ ...diagnostics, error: 'Gate 1 browser smoke exceeded 90 seconds' }, null, 2));
  process.exit(124);
}, 90000);

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
const eventWaiters = new Map();
const eventHistory = new Map();
const requests = [];
let messageId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function rememberEvent(method, params) {
  const history = eventHistory.get(method) || [];
  history.push(params);
  if (history.length > 50) history.shift();
  eventHistory.set(method, history);
}

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    return;
  }
  if (message.method) rememberEvent(message.method, message.params);
  if (eventWaiters.has(message.method)) {
    const remaining = [];
    for (const waiter of eventWaiters.get(message.method)) {
      if (!waiter.predicate || waiter.predicate(message.params)) {
        clearTimeout(waiter.timer);
        waiter.resolve(message.params);
      } else {
        remaining.push(waiter);
      }
    }
    if (remaining.length) eventWaiters.set(message.method, remaining);
    else eventWaiters.delete(message.method);
  }
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  if (message.method === 'Network.loadingFailed') diagnostics.loadingFailures.push({
    requestId: message.params.requestId,
    errorText: message.params.errorText,
    blockedReason: message.params.blockedReason || null
  });
  if (message.method === 'Runtime.consoleAPICalled') diagnostics.console.push({
    type: message.params.type,
    values: message.params.args.map((item) => item.value ?? item.description ?? item.type)
  });
  if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push({
    text: message.params.exceptionDetails.text,
    description: message.params.exceptionDetails.exception?.description || null
  });
});

function waitForEvent(method, { predicate = null, timeoutMs = 30000, label = method } = {}) {
  const previous = eventHistory.get(method) || [];
  const match = previous.find((params) => !predicate || predicate(params));
  if (match) return Promise.resolve(match);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const waiters = eventWaiters.get(method) || [];
      eventWaiters.set(method, waiters.filter((item) => item.resolve !== resolve));
      reject(new Error(`Browser event timed out at ${diagnostics.stage}: ${label}`));
    }, timeoutMs);
    const waiters = eventWaiters.get(method) || [];
    waiters.push({ resolve, reject, timer, predicate });
    eventWaiters.set(method, waiters);
  });
}

function send(method, params = {}, { label = method, timeoutMs = 30000 } = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP command timed out at ${diagnostics.stage}: ${label}`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });
}

async function evaluate(expression, { label = 'Runtime.evaluate', awaitPromise = true, timeoutMs = 30000 } = {}) {
  const result = await send(
    'Runtime.evaluate',
    { expression, awaitPromise, returnByValue: true, userGesture: true },
    { label, timeoutMs }
  );
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed';
    throw new Error(`${label}: ${description}`);
  }
  return result.result.value;
}

async function waitExpression(expression, { label, expected = true, attempts = 150 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const value = await evaluate(expression, { label: `${label} poll ${i + 1}`, timeoutMs: 10000 });
    if (value === expected) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition did not become ${expected}: ${label}`);
}

async function pageSnapshot() {
  try {
    return await evaluate(`({
      href: location.href,
      readyState: document.readyState,
      title: document.title,
      vaultReady: window.__AEGIS_VAULT_READY__ === true,
      vaultStatus: window.__AEGIS_VAULT_TEST__?.status?.().status || null,
      serviceWorker: window.__AEGIS_SW_STATE__ || null,
      bodyText: document.body?.innerText?.slice(0, 500) || ''
    })`, { label: 'diagnostic page snapshot', timeoutMs: 5000 });
  } catch (error) {
    return { snapshotError: error.message };
  }
}

try {
  diagnostics.stage = 'enable browser domains';
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Page.setLifecycleEventsEnabled', { enabled: true });

  diagnostics.stage = 'navigate to synthetic coach';
  const navigation = await send('Page.navigate', { url: targetUrl });
  if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
  await waitForEvent('Page.lifecycleEvent', {
    predicate: (params) => params.loaderId === navigation.loaderId && params.name === 'load',
    label: `AEGIS loader ${navigation.loaderId} load`,
    timeoutMs: 30000
  });
  await waitExpression('window.__AEGIS_VAULT_READY__ === true', { label: 'vault module ready' });

  diagnostics.stage = 'verify service worker registration';
  await waitExpression(`['registered', 'failed', 'unsupported'].includes(window.__AEGIS_SW_STATE__?.status)`, { label: 'service worker registration result' });
  const serviceWorkerState = await evaluate('window.__AEGIS_SW_STATE__', { label: 'read service worker state' });
  assert.equal(serviceWorkerState.status, 'registered', `Service worker registration failed: ${serviceWorkerState.error || serviceWorkerState.status}`);
  await waitExpression(`['activated', 'activating', 'installed'].includes(window.__AEGIS_SW_STATE__?.workerState)`, { label: 'service worker activation', attempts: 250 });

  diagnostics.stage = 'create encrypted vault';
  await evaluate(`document.querySelector('[data-view="vault"]').click()`, { label: 'open vault view' });
  await waitExpression(`!document.querySelector('#vault-view').hidden`, { label: 'vault view visible' });
  await evaluate(`
    document.querySelector('#new-passphrase').value = 'synthetic-vault-passphrase';
    document.querySelector('#confirm-passphrase').value = 'synthetic-vault-passphrase';
    document.querySelector('#create-vault-form').requestSubmit();
  `, { label: 'submit vault creation form' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'unlocked'`, { label: 'vault created and unlocked', attempts: 300 });
  const rawEnvelope = await evaluate(`window.__AEGIS_VAULT_TEST__.rawEnvelopeText()`, { label: 'read encrypted envelope' });
  assert.equal(rawEnvelope.includes('preferences'), false);
  assert.equal(rawEnvelope.includes('calendar'), false);

  diagnostics.stage = 'manual lock and unlock';
  await evaluate(`window.__AEGIS_VAULT_TEST__.lock('browser-test')`, { label: 'manual vault lock' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`, { label: 'manual lock state' });
  await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`, { label: 'manual vault unlock', timeoutMs: 45000 });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'unlocked'`, { label: 'manual unlock state' });

  diagnostics.stage = 'page exit lock';
  await evaluate(`window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))`, { label: 'dispatch pagehide' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`, { label: 'pagehide lock state' });

  diagnostics.stage = 'BFCache restore lock';
  await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`, { label: 'unlock before BFCache test', timeoutMs: 45000 });
  await evaluate(`window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))`, { label: 'dispatch persisted pageshow' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`, { label: 'BFCache lock state' });

  diagnostics.stage = 'cross-tab lock';
  await evaluate(`window.__AEGIS_VAULT_TEST__.unlock('synthetic-vault-passphrase')`, { label: 'unlock before cross-tab test', timeoutMs: 45000 });
  await evaluate(`
    (() => {
      const channel = new BroadcastChannel(window.__AEGIS_VAULT_TEST__.storageInfo.channel);
      channel.postMessage({ type: 'lock', reason: 'browser-test' });
      setTimeout(() => channel.close(), 20);
    })()
  `, { label: 'broadcast cross-tab lock' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'locked'`, { label: 'cross-tab lock state' });

  diagnostics.stage = 'inspect service worker cache';
  const cacheState = await evaluate(`
    (async () => {
      const names = await caches.keys();
      const entries = [];
      for (const name of names) {
        const cache = await caches.open(name);
        entries.push({ name, urls: (await cache.keys()).map((request) => request.url) });
      }
      return entries;
    })()
  `, { label: 'read service worker caches', timeoutMs: 20000 });
  assert.ok(cacheState.some((cache) => cache.name === 'aegis-synthetic-static-v2'));
  assert.equal(cacheState.flatMap((cache) => cache.urls).some((url) => url.includes('/api/')), false);
  assert.equal(cacheState.flatMap((cache) => cache.urls).some((url) => new URL(url).origin !== new URL(targetUrl).origin), false);

  diagnostics.stage = 'verify zero external requests';
  const external = requests.filter((url) => {
    try { return new URL(url).origin !== new URL(targetUrl).origin && !url.startsWith('devtools://'); }
    catch { return false; }
  });
  assert.deepEqual(external, []);

  diagnostics.stage = 'delete encrypted vault';
  await evaluate(`window.__AEGIS_VAULT_TEST__.delete()`, { label: 'delete encrypted vault' });
  await waitExpression(`window.__AEGIS_VAULT_TEST__.status().status === 'not-created'`, { label: 'vault deletion state' });

  console.log(JSON.stringify({
    vaultLifecycle: 'passed',
    encryptedAtRest: 'checked',
    pageExitLock: 'passed',
    bfcacheLock: 'passed',
    broadcastLock: 'passed',
    serviceWorker: serviceWorkerState,
    serviceWorkerCache: cacheState,
    externalRequests: external
  }, null, 2));
} catch (error) {
  diagnostics.error = error.message;
  diagnostics.page = await pageSnapshot();
  console.error(JSON.stringify(diagnostics, null, 2));
  process.exitCode = 1;
} finally {
  clearTimeout(overallTimeout);
  for (const item of pending.values()) clearTimeout(item.timer);
  pending.clear();
  for (const waiters of eventWaiters.values()) for (const item of waiters) clearTimeout(item.timer);
  eventWaiters.clear();
  socket.close();
}
