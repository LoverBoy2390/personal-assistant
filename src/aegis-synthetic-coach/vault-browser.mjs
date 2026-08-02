import { createLockController, lifecycleLockReason } from './vault-core.mjs';

const DB_NAME = 'aegis-synthetic-vault';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted-envelopes';
const ACTIVE_KEY = 'active';
const CHANNEL_NAME = 'aegis-synthetic-vault-state';

function requireIndexedDb() {
  if (!globalThis.indexedDB) throw new Error('IndexedDB is unavailable');
  return globalThis.indexedDB;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open encrypted vault storage'));
  });
}

async function transaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let request;
      let result = null;
      try { request = operation(store); } catch (error) { reject(error); return; }
      request.onsuccess = () => { result = request.result ?? null; };
      request.onerror = () => reject(request.error || new Error('Encrypted vault storage operation failed'));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Encrypted vault storage transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('Encrypted vault storage transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export function loadEncryptedEnvelope() {
  return transaction('readonly', (store) => store.get(ACTIVE_KEY));
}

export function saveEncryptedEnvelope(envelope) {
  return transaction('readwrite', (store) => store.put(envelope, ACTIVE_KEY));
}

export function deleteEncryptedEnvelope() {
  return transaction('readwrite', (store) => store.delete(ACTIVE_KEY));
}

export function createLifecycleRuntime({ timeoutMs = 5 * 60 * 1000, onLock = () => {}, clock } = {}) {
  const controller = createLockController({ timeoutMs, clock });
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_NAME) : null;
  let disposed = false;

  function lock(reason, broadcast = false) {
    if (!controller.status().unlocked) return;
    controller.lock(reason);
    onLock(reason);
    if (broadcast && channel) channel.postMessage({ type: 'lock', reason, at: new Date().toISOString() });
  }

  function activity() { controller.touch(); }
  function visibility() {
    if (document.visibilityState === 'hidden') lock(lifecycleLockReason('visibility-hidden'), true);
  }
  function pageHide() { lock(lifecycleLockReason('pagehide'), true); }
  function pageShow(event) {
    const reason = lifecycleLockReason('pageshow', event.persisted === true);
    if (reason) lock(reason, true);
  }
  function message(event) {
    if (event.data?.type === 'lock') lock(lifecycleLockReason('broadcast-lock'), false);
  }

  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  for (const type of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(type, activity, { passive: true });
  if (channel) channel.addEventListener('message', message);

  const timer = setInterval(() => {
    const wasUnlocked = controller.status().unlocked;
    const stillUnlocked = controller.check();
    if (wasUnlocked && !stillUnlocked) onLock('timeout');
  }, 1000);

  return {
    unlock() { controller.unlock(); },
    lock(reason = 'manual', broadcast = true) { lock(reason, broadcast); },
    touch: activity,
    status: () => controller.status(),
    forceTimeoutForTest() {
      if (controller.status().unlocked) {
        controller.lock('timeout');
        onLock('timeout');
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      for (const type of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(type, activity);
      channel?.removeEventListener('message', message);
      channel?.close();
    }
  };
}

export const VAULT_STORAGE_INFO = Object.freeze({
  database: DB_NAME,
  store: STORE_NAME,
  key: ACTIVE_KEY,
  channel: CHANNEL_NAME,
  content: 'AES-GCM encrypted synthetic envelope only'
});
