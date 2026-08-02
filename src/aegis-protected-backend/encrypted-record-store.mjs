import { randomBytes } from 'node:crypto';
import { aesDecrypt, aesEncrypt, canonical, requireSynthetic, sha256 } from './crypto-utils.mjs';

export class EncryptedRecordStore {
  constructor({ keys, purpose, now = () => Date.now() }) {
    if (!['data', 'token'].includes(purpose)) throw new Error('Encrypted store purpose must be data or token');
    this.keys = keys;
    this.purpose = purpose;
    this.now = now;
    this.records = new Map();
  }

  bucket(userId) {
    if (!this.records.has(userId)) this.records.set(userId, new Map());
    return this.records.get(userId);
  }

  async put(userId, recordId, value, { expiresAt = null } = {}) {
    requireSynthetic(value);
    const dek = randomBytes(32);
    const metadata = {
      format: `aegis-${this.purpose}-record/v1`,
      ownerHash: sha256(userId),
      recordId,
      createdAt: new Date(this.now()).toISOString(),
      expiresAt
    };
    const encrypted = await aesEncrypt(dek, canonical(value), canonical(metadata));
    const record = Object.freeze({ ...metadata, ...encrypted, wrappedDek: await this.keys.wrapDek(this.purpose, dek) });
    this.bucket(userId).set(recordId, record);
    return record;
  }

  async get(userId, recordId) {
    const record = this.records.get(userId)?.get(recordId);
    if (!record) return null;
    if (record.expiresAt && Date.parse(record.expiresAt) <= this.now()) {
      this.records.get(userId).delete(recordId);
      return null;
    }
    const dek = await this.keys.unwrapDek(this.purpose, record.wrappedDek);
    const metadata = {
      format: record.format,
      ownerHash: record.ownerHash,
      recordId: record.recordId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt
    };
    const value = JSON.parse(await aesDecrypt(dek, record, canonical(metadata)));
    requireSynthetic(value);
    return value;
  }

  async list(userId) {
    const bucket = this.records.get(userId) || new Map();
    const result = [];
    for (const recordId of bucket.keys()) {
      const value = await this.get(userId, recordId);
      if (value !== null) result.push({ recordId, value });
    }
    return result;
  }

  raw(userId, recordId) {
    return this.records.get(userId)?.get(recordId) || null;
  }

  deleteUser(userId) {
    return this.records.delete(userId);
  }

  purgeExpired() {
    let removed = 0;
    for (const [userId, bucket] of this.records.entries()) {
      for (const [recordId, record] of bucket.entries()) {
        if (record.expiresAt && Date.parse(record.expiresAt) <= this.now()) {
          bucket.delete(recordId);
          removed += 1;
        }
      }
      if (!bucket.size) this.records.delete(userId);
    }
    return removed;
  }

  snapshotUser(userId) {
    return [...(this.records.get(userId) || new Map()).entries()].map(([recordId, record]) => ({ recordId, record }));
  }

  restoreUser(userId, snapshot) {
    const bucket = new Map();
    for (const item of snapshot || []) bucket.set(item.recordId, Object.freeze(item.record));
    this.records.set(userId, bucket);
  }

  async rewrapAll() {
    for (const bucket of this.records.values()) {
      for (const [recordId, record] of bucket.entries()) {
        const dek = await this.keys.unwrapDek(this.purpose, record.wrappedDek);
        bucket.set(recordId, Object.freeze({ ...record, wrappedDek: await this.keys.wrapDek(this.purpose, dek) }));
      }
    }
  }
}
