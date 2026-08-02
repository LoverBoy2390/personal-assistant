const FORMAT = 'aegis-synthetic-vault/v1';
const DEFAULT_ITERATIONS = 310000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function webCrypto() {
  const value = globalThis.crypto;
  if (!value?.subtle || !value?.getRandomValues) throw new Error('WebCrypto is required');
  return value;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonical(value) {
  return JSON.stringify(stable(value));
}

async function sha256Base64(value) {
  const digest = await webCrypto().subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function randomBytes(length) {
  return webCrypto().getRandomValues(new Uint8Array(length));
}

function assertPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error('Passphrase must contain 12 to 1024 characters');
  }
}

export function assertSyntheticPayload(payload) {
  if (!payload || payload.synthetic !== true) {
    throw new Error('Vault accepts only payloads explicitly marked synthetic=true');
  }
  return true;
}

async function deriveKey(passphrase, salt, iterations, usages) {
  assertPassphrase(passphrase);
  const material = await webCrypto().subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return webCrypto().subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

function envelopeHeader({ createdAt, updatedAt, revision, kdf, cipher }) {
  return { format: FORMAT, createdAt, updatedAt, revision, kdf, cipher };
}

export async function createEncryptedEnvelope(passphrase, payload, options = {}) {
  assertSyntheticPayload(payload);
  assertPassphrase(passphrase);
  const now = options.now || new Date().toISOString();
  const iterations = Number.isInteger(options.iterations) ? options.iterations : DEFAULT_ITERATIONS;
  if (iterations < 10000) throw new Error('PBKDF2 iteration count is too low');
  const salt = options.salt || randomBytes(16);
  const iv = options.iv || randomBytes(12);
  const kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: bytesToBase64(salt) };
  const cipher = { name: 'AES-GCM', iv: bytesToBase64(iv), tagLength: 128 };
  const header = envelopeHeader({ createdAt: now, updatedAt: now, revision: 1, kdf, cipher });
  const key = await deriveKey(passphrase, salt, iterations, ['encrypt']);
  const plaintext = encoder.encode(canonical(payload));
  const encrypted = await webCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(canonical(header)), tagLength: 128 },
    key,
    plaintext
  );
  return Object.freeze({ ...header, ciphertext: bytesToBase64(new Uint8Array(encrypted)) });
}

export function validateEnvelope(envelope) {
  if (!envelope || envelope.format !== FORMAT) throw new Error('Unsupported vault format');
  if (envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256') throw new Error('Unsupported vault KDF');
  if (!Number.isInteger(envelope.kdf?.iterations) || envelope.kdf.iterations < 10000 || envelope.kdf.iterations > 2000000) throw new Error('Invalid vault KDF settings');
  if (envelope.cipher?.name !== 'AES-GCM' || envelope.cipher?.tagLength !== 128) throw new Error('Unsupported vault cipher');
  for (const field of ['salt']) if (typeof envelope.kdf[field] !== 'string') throw new Error('Invalid vault KDF metadata');
  for (const field of ['iv']) if (typeof envelope.cipher[field] !== 'string') throw new Error('Invalid vault cipher metadata');
  if (!Number.isInteger(envelope.revision) || envelope.revision < 1) throw new Error('Invalid vault revision');
  if (Number.isNaN(Date.parse(envelope.createdAt)) || Number.isNaN(Date.parse(envelope.updatedAt))) throw new Error('Invalid vault timestamps');
  if (typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length < 16 || envelope.ciphertext.length > 1500000) throw new Error('Invalid vault ciphertext');
  if (base64ToBytes(envelope.kdf.salt).length !== 16 || base64ToBytes(envelope.cipher.iv).length !== 12) throw new Error('Invalid vault cryptographic metadata');
  return true;
}

export async function decryptEnvelope(passphrase, envelope) {
  validateEnvelope(envelope);
  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations, ['decrypt']);
  const header = envelopeHeader(envelope);
  let decrypted;
  try {
    decrypted = await webCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(canonical(header)), tagLength: 128 },
      key,
      base64ToBytes(envelope.ciphertext)
    );
  } catch {
    throw new Error('Vault unlock failed');
  }
  let payload;
  try {
    payload = JSON.parse(decoder.decode(decrypted));
  } catch {
    throw new Error('Vault payload is invalid');
  }
  assertSyntheticPayload(payload);
  return payload;
}

export async function replaceEncryptedPayload(passphrase, envelope, payload, options = {}) {
  validateEnvelope(envelope);
  assertSyntheticPayload(payload);
  const now = options.now || new Date().toISOString();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kdf = { ...envelope.kdf, salt: bytesToBase64(salt) };
  const cipher = { ...envelope.cipher, iv: bytesToBase64(iv) };
  const header = envelopeHeader({
    createdAt: envelope.createdAt,
    updatedAt: now,
    revision: envelope.revision + 1,
    kdf,
    cipher
  });
  const key = await deriveKey(passphrase, salt, kdf.iterations, ['encrypt']);
  const encrypted = await webCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(canonical(header)), tagLength: 128 },
    key,
    encoder.encode(canonical(payload))
  );
  return Object.freeze({ ...header, ciphertext: bytesToBase64(new Uint8Array(encrypted)) });
}

export async function exportEncryptedBackup(envelope) {
  validateEnvelope(envelope);
  const body = canonical(envelope);
  return JSON.stringify({
    format: 'aegis-synthetic-backup/v1',
    createdAt: new Date().toISOString(),
    envelope,
    checksum: { algorithm: 'SHA-256', value: await sha256Base64(body) }
  }, null, 2);
}

export async function parseEncryptedBackup(text, passphrase) {
  const serialized = String(text);
  if (serialized.length > 2000000) throw new Error('Backup exceeds the 2 MB synthetic-vault limit');
  let backup;
  try { backup = JSON.parse(serialized); } catch { throw new Error('Backup is not valid JSON'); }
  if (backup?.format !== 'aegis-synthetic-backup/v1') throw new Error('Unsupported backup format');
  validateEnvelope(backup.envelope);
  const expected = await sha256Base64(canonical(backup.envelope));
  if (backup.checksum?.algorithm !== 'SHA-256' || backup.checksum?.value !== expected) {
    throw new Error('Backup checksum failed');
  }
  const payload = await decryptEnvelope(passphrase, backup.envelope);
  return { envelope: backup.envelope, payload };
}

export async function restoreWithRollback({ currentEnvelope, backupText, passphrase }) {
  try {
    const restored = await parseEncryptedBackup(backupText, passphrase);
    return { ok: true, activeEnvelope: restored.envelope, payload: restored.payload, rollbackEnvelope: currentEnvelope || null, error: null };
  } catch (error) {
    return { ok: false, activeEnvelope: currentEnvelope || null, payload: null, rollbackEnvelope: currentEnvelope || null, error: error.message };
  }
}

export function createLockController({ timeoutMs = 5 * 60 * 1000, clock = () => Date.now() } = {}) {
  let unlocked = false;
  let lastActivity = 0;
  let reason = 'initial';
  return {
    unlock() { unlocked = true; lastActivity = clock(); reason = null; },
    lock(nextReason = 'manual') { unlocked = false; reason = nextReason; },
    touch() { if (unlocked) lastActivity = clock(); },
    check() {
      if (unlocked && clock() - lastActivity >= timeoutMs) {
        unlocked = false;
        reason = 'timeout';
      }
      return unlocked;
    },
    status() { return { unlocked, lastActivity, reason, timeoutMs }; }
  };
}

export function lifecycleLockReason(type, persisted = false) {
  if (type === 'pagehide') return 'page-exit';
  if (type === 'visibility-hidden') return 'page-hidden';
  if (type === 'pageshow' && persisted) return 'bfcache-restore';
  if (type === 'broadcast-lock') return 'another-tab';
  return null;
}

export const VAULT_FORMAT = FORMAT;
export const VAULT_DEFAULT_ITERATIONS = DEFAULT_ITERATIONS;
