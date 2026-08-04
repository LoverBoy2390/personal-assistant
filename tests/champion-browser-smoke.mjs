import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const cdp = process.env.AEGIS_CDP || 'http://127.0.0.1:9223';
const url = process.env.AEGIS_URL || 'http://127.0.0.1:8765/src/aegis-champion/';
const cacheName = process.env.AEGIS_EXPECTED_CACHE || 'aegis-biocore-heart-v1';
const shots = process.env.AEGIS_SCREENSHOT_DIR || '';
const diagnostics = { stage: 'init', requests: [], exceptions: [] };
const timeout = setTimeout(() => { console.error(JSON.stringify({ ...diagnostics, error: 'timeout' }, null, 2)); process.exit(124); }, 120000);

async function json(endpoint, options) {
  let error;
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(endpoint, options); if (response.ok) return response.json(); error = new Error(`HTTP ${response.status}`); }
    catch (caught) { error = caught; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw error;
}

const target = await json(`${cdp}/json/new?about%3Ablank`, { method: 'PUT' });
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const entry = pending.get(message.id); clearTimeout(entry.timer); pending.delete(message.id);
    return message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
  }
  if (message.method === 'Network.requestWillBeSent') diagnostics.requests.push(message.params.request.url);
  if (message.method === 'Runtime.exceptionThrown') diagnostics.exceptions.push(message.params.exceptionDetails.text);
});

function send(method, params = {}, ms = 30000) {
  const callId = ++id; socket.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`${diagnostics.stage}: ${method} timed out`)); }, ms);
    pending.set(callId, { resolve, reject, timer });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function wait(expression, label, attempts = 220) {
  for (let i = 0; i < attempts; i += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition failed: ${label}`);
}

async function screenshot(name) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${shots}/${name}.png`, Buffer.from(result.data, 'base64'));
}

try {
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  diagnostics.stage = 'gateway';
  await send('Page.navigate', { url });
  await wait('document.readyState === "complete"', 'document complete');
  await wait('window.__AEGIS_CHAMPION_READY__ === true', 'BioCore ready');

  const gateway = await evaluate(`({
    title: document.title,
    meta: window.__AEGIS_BIOCORE__,
    chamber: document.querySelector('.biocore-shell')?.dataset.chamber,
    heart: Boolean(document.querySelector('#heart-trigger .heart-svg')),
    metrics: document.querySelectorAll('.heart-metric').length,
    organs: document.querySelectorAll('.organ-button').length,
    animation: getComputedStyle(document.querySelector('#heart-trigger .heart-svg')).animationName,
    text: document.body.innerText,
    width: document.documentElement.scrollWidth
  })`);
  assert.equal(gateway.title, 'AEGIS BioCore Heart');
  assert.deepEqual({ version: gateway.meta.version, experience: gateway.meta.experience, organ: gateway.meta.organ, amplification: gateway.meta.visualAmplification, simulated: gateway.meta.simulatedData }, { version: '1.0.0', experience: 'organ-gateway', organ: 'heart', amplification: 100, simulated: true });
  assert.equal(gateway.chamber, 'gateway'); assert.equal(gateway.heart, true); assert.equal(gateway.metrics, 6); assert.equal(gateway.organs, 5);
  assert.ok(gateway.animation.includes('heartIdle')); assert.ok(gateway.width <= 1442);
  for (const marker of ['HEART', 'THE CORE ENGINE', 'Tap heart to open', 'Visual amplification active', 'SIMULATED']) assert.ok(gateway.text.toUpperCase().includes(marker.toUpperCase()));
  await screenshot('biocore-heart-gateway-desktop');

  diagnostics.stage = 'beat transition';
  await evaluate(`document.querySelector('#heart-trigger').click()`);
  await wait(`document.querySelector('.heart-trigger')?.classList.contains('is-beating') === true`, 'heart beat');
  await wait(`document.querySelector('.biocore-shell')?.dataset.chamber === 'vital'`, 'Vital Core');
  const vital = await evaluate(`({ text: document.body.innerText, cards: document.querySelectorAll('.vital-grid .heart-metric').length, back: !!document.querySelector('#heart-back'), action: !!document.querySelector('.vital-action') })`);
  assert.equal(vital.cards, 4); assert.equal(vital.back, true); assert.equal(vital.action, true);
  for (const marker of ['VITAL CORE', 'Your system pulse.', 'BEST NEXT ACTION', 'Demonstration data only']) assert.ok(vital.text.includes(marker));
  await screenshot('biocore-vital-core-desktop');

  diagnostics.stage = 'reserved organ';
  await evaluate(`document.querySelector('[data-organ="brain"]').click()`);
  await wait(`document.querySelector('#organ-toast')?.classList.contains('show') === true`, 'reserved toast');
  assert.ok((await evaluate(`document.querySelector('#organ-toast').innerText`)).includes('reserved for the next BioCore build'));

  diagnostics.stage = 'mobile';
  await evaluate(`document.querySelector('#heart-back').click()`); await wait(`document.querySelector('.biocore-shell')?.dataset.chamber === 'gateway'`, 'gateway return');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise((resolve) => setTimeout(resolve, 450));
  const mobile = await evaluate(`({ viewport: innerWidth, page: document.documentElement.scrollWidth, dock: document.querySelector('.organ-dock').getBoundingClientRect().width, heart: document.querySelector('#heart-trigger').getBoundingClientRect().width, metric: document.querySelector('.heart-metric').getBoundingClientRect().width })`);
  assert.equal(mobile.viewport, 390); assert.ok(mobile.page <= 392); assert.ok(mobile.dock <= 370); assert.ok(mobile.heart <= 390); assert.ok(mobile.metric <= 140);
  await screenshot('biocore-heart-gateway-mobile');

  diagnostics.stage = 'reduced motion';
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const reduced = await evaluate(`({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, duration: parseFloat(getComputedStyle(document.querySelector('#heart-trigger .heart-svg')).animationDuration) })`);
  assert.equal(reduced.matches, true); assert.ok(reduced.duration <= 0.01);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  diagnostics.stage = 'shield';
  await evaluate(`document.querySelector('#biocore-shield').click()`); await wait(`!document.querySelector('#system-view').hidden`, 'Shield Room');
  const shield = await evaluate(`document.querySelector('#system-view').innerText`);
  for (const marker of ['External network disabled', 'No AWS runtime', 'No real accounts', 'No consequential actions']) assert.ok(shield.includes(marker));

  diagnostics.stage = 'cache';
  await wait(`window.__AEGIS_SW_STATE__?.status === 'registered'`, 'service worker', 260);
  const cachesState = await evaluate(`(async()=>{const result=[];for(const name of await caches.keys()){const cache=await caches.open(name);result.push({name,urls:(await cache.keys()).map(r=>r.url)});}return result;})()`);
  assert.ok(cachesState.some((cache) => cache.name === cacheName));
  const cached = cachesState.flatMap((cache) => cache.urls);
  assert.ok(cached.some((item) => item.endsWith('/heart-graphic.mjs'))); assert.ok(cached.some((item) => item.endsWith('/biocore-heart.css')));
  assert.equal(cached.some((item) => item.includes('/api/')), false); assert.equal(cached.some((item) => new URL(item).origin !== new URL(url).origin), false);

  const external = diagnostics.requests.filter((item) => { try { return !item.startsWith('devtools://') && new URL(item).origin !== new URL(url).origin; } catch { return false; } });
  assert.deepEqual(external, []); assert.deepEqual(diagnostics.exceptions, []);
  console.log(JSON.stringify({ biocoreReady: true, heartGateway: true, beatTransition: true, vitalCore: true, mobile: true, reducedMotion: true, shieldRoom: true, cache: cacheName, externalRequests: external, exceptions: diagnostics.exceptions }, null, 2));
} catch (error) {
  diagnostics.error = error.message; console.error(JSON.stringify(diagnostics, null, 2)); process.exitCode = 1;
} finally {
  clearTimeout(timeout); for (const entry of pending.values()) clearTimeout(entry.timer); pending.clear(); socket.close();
}
