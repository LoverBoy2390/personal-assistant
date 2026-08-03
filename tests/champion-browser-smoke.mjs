import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const devtools = process.env.AEGIS_CDP || 'http://127.0.0.1:9223';
const targetUrl = process.env.AEGIS_URL || 'http://127.0.0.1:8765/src/aegis-champion/';
const expectedCache = process.env.AEGIS_EXPECTED_CACHE || 'aegis-champion-home-v2';
const diagnostics = { stage: 'initializing', console: [], exceptions: [], requests: [] };
const screenshotDir = process.env.AEGIS_SCREENSHOT_DIR || '';
const overallTimeout = setTimeout(() => {
  console.error(JSON.stringify({ ...diagnostics, error: 'Champion Home browser smoke exceeded 90 seconds' }, null, 2));
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });

  diagnostics.stage = 'navigate to Champion Home';
  const navigation = await send('Page.navigate', { url: targetUrl });
  if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
  await waitExpression('document.readyState === "complete"', 'document complete');
  await waitExpression('window.__AEGIS_CHAMPION_READY__ === true', 'Champion module ready');

  diagnostics.stage = 'verify welcoming home';
  const home = await evaluate(`({
    title: document.title,
    text: document.body.innerText,
    homeVersion: window.__AEGIS_CHAMPION_HOME__?.version,
    experience: window.__AEGIS_CHAMPION_HOME__?.experience,
    hero: Boolean(document.querySelector('.home-hero')),
    presence: Boolean(document.querySelector('.champion-presence')),
    nextMove: Boolean(document.querySelector('.next-move')),
    pulseCount: document.querySelectorAll('.daily-pulse .pulse-card').length,
    heroWidth: document.querySelector('.home-hero')?.getBoundingClientRect().width || 0,
    coreAnimation: getComputedStyle(document.querySelector('.core')).animationName,
    auroraAnimation: getComputedStyle(document.querySelector('.aurora')).animationName,
    systemButton: Boolean(document.querySelector('[data-view="system"]')),
    vaultButton: Boolean(document.querySelector('[data-view="vault"]'))
  })`, 'visible Champion Home state');

  assert.equal(home.title, 'AEGIS Champion Home');
  assert.equal(home.homeVersion, '0.9.0');
  assert.equal(home.experience, 'welcome-first');
  assert.equal(home.hero, true);
  assert.equal(home.presence, true);
  assert.equal(home.nextMove, true);
  assert.equal(home.pulseCount, 4);
  assert.ok(home.heroWidth > 900, `Desktop hero too narrow: ${home.heroWidth}`);
  assert.ok(home.coreAnimation.includes('coreFloat'), `Core animation missing: ${home.coreAnimation}`);
  assert.ok(home.auroraAnimation.includes('auroraDrift'), `Aurora animation missing: ${home.auroraAnimation}`);
  assert.equal(home.systemButton, true);
  assert.equal(home.vaultButton, true);

  const renderedHomeText = home.text.toLocaleLowerCase();
  for (const marker of [
    'LOCAL-ONLY · SYNTHETIC DATA',
    'Welcome home',
    'Good morning, Champion.',
    'Your day, held together.',
    'Best next action',
    'External accounts',
    '0 connected',
    '$0 enabled',
    'Cloud synchronization'
  ]) assert.ok(renderedHomeText.includes(marker.toLocaleLowerCase()), `Missing visible marker: ${marker}`);

  if (screenshotDir) {
    mkdirSync(screenshotDir, { recursive: true });
    const desktopShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(`${screenshotDir}/champion-home-desktop.png`, Buffer.from(desktopShot.data, 'base64'));
  }

  diagnostics.stage = 'verify narrow mobile home';
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
  const mobile = await evaluate(`({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    pulseColumns: getComputedStyle(document.querySelector('.daily-pulse')).gridTemplateColumns,
    heroColumns: getComputedStyle(document.querySelector('.home-hero')).gridTemplateColumns,
    navOverflow: getComputedStyle(document.querySelector('.sidebar nav')).overflowX
  })`, 'mobile Champion Home state');
  assert.equal(mobile.viewport, 390);
  assert.ok(mobile.scrollWidth <= 392, `Mobile horizontal overflow: ${mobile.scrollWidth}`);
  assert.equal(mobile.pulseColumns.trim().split(/\s+/).length, 1);
  assert.equal(mobile.heroColumns.trim().split(/\s+/).length, 1);
  assert.equal(mobile.navOverflow, 'auto');

  if (screenshotDir) {
    const mobileShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(`${screenshotDir}/champion-home-mobile.png`, Buffer.from(mobileShot.data, 'base64'));
  }

  diagnostics.stage = 'verify reduced motion';
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  const reduced = await evaluate(`({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    duration: parseFloat(getComputedStyle(document.querySelector('.core')).animationDuration)
  })`, 'reduced motion state');
  assert.equal(reduced.matches, true);
  assert.ok(reduced.duration <= 0.01, `Reduced-motion duration too long: ${reduced.duration}`);
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
  });

  diagnostics.stage = 'verify Shield Room';
  await evaluate(`document.querySelector('[data-view="system"]').click()`, 'open Shield Room');
  await waitExpression(`!document.querySelector('#system-view').hidden`, 'Shield Room visible');
  const systemText = await evaluate(`document.querySelector('#system-view').innerText`, 'Shield Room text');
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
    experience: 'welcome-first',
    desktopHome: true,
    mobileHome: true,
    reducedMotion: true,
    shieldRoom: true,
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
