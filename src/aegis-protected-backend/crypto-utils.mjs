import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  webcrypto
} from 'node:crypto';

const { subtle } = webcrypto;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function canonical(value) {
  return JSON.stringify(stable(value));
}

export function base64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64url(value) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('base64url');
}

export function secureEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomId(prefix) {
  return `${prefix}_${base64url(randomBytes(18))}`;
}

export function requireSynthetic(value) {
  if (!value || value.synthetic !== true) throw new Error('Gate 2 accepts synthetic records only');
}

export function assertPurpose(purpose) {
  if (!['session', 'data', 'token', 'audit', 'backup'].includes(purpose)) {
    throw new Error(`Unsupported key purpose: ${purpose}`);
  }
}

async function importAesKey(bytes, usages) {
  return subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, usages);
}

export async function aesEncrypt(keyBytes, plaintext, aad) {
  const iv = randomBytes(12);
  const key = await importAesKey(keyBytes, ['encrypt']);
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(aad), tagLength: 128 },
    key,
    encoder.encode(plaintext)
  );
  return { iv: base64url(iv), ciphertext: base64url(new Uint8Array(encrypted)) };
}

export async function aesDecrypt(keyBytes, envelope, aad) {
  const key = await importAesKey(keyBytes, ['decrypt']);
  try {
    const decrypted = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64url(envelope.iv),
        additionalData: encoder.encode(aad),
        tagLength: 128
      },
      key,
      fromBase64url(envelope.ciphertext)
    );
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Authenticated decryption failed');
  }
}
