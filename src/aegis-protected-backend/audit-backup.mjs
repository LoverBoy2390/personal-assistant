import { createHmac, randomBytes } from 'node:crypto';
import { aesDecrypt, aesEncrypt, canonical, requireSynthetic, secureEqual, sha256 } from './crypto-utils.mjs';

export class TamperEvidentAuditLog {
  constructor({ keys, now = () => Date.now() } = {}) {
    this.keys = keys;
    this.now = now;
    this.entries = [];
  }

  append({ subjectHash, action, result, metadata = {} }) {
    const { kid, key } = this.keys.activeKey('audit');
    const body = {
      seq: this.entries.length + 1,
      at: new Date(this.now()).toISOString(),
      subjectHash,
      action: String(action).slice(0, 100),
      result: String(result).slice(0, 40),
      metadata,
      previousHash: this.entries.at(-1)?.hash || null,
      kid
    };
    const hash = createHmac('sha256', key).update(canonical(body)).digest('base64url');
    const entry = Object.freeze({ ...body, hash });
    this.entries.push(entry);
    return entry;
  }

  verify(entries = this.entries) {
    let previousHash = null;
    for (let index = 0; index < entries.length; index += 1) {
      const { hash, ...body } = entries[index];
      if (body.seq !== index + 1 || body.previousHash !== previousHash) return false;
      const expected = createHmac('sha256', this.keys.key('audit', body.kid)).update(canonical(body)).digest('base64url');
      if (!secureEqual(hash, expected)) return false;
      previousHash = hash;
    }
    return true;
  }
}

export class BackupManager {
  constructor({ keys, now = () => Date.now() } = {}) {
    this.keys = keys;
    this.now = now;
  }

  async create(payload) {
    requireSynthetic(payload);
    const dek = randomBytes(32);
    const { kid } = this.keys.activeKey('backup');
    const metadata = {
      format: 'aegis-gate2-backup/v1',
      createdAt: new Date(this.now()).toISOString(),
      kid,
      checksum: sha256(payload)
    };
    const encrypted = await aesEncrypt(dek, canonical(payload), canonical(metadata));
    return { ...metadata, ...encrypted, wrappedDek: await this.keys.wrapDek('backup', dek) };
  }

  async restore(backup) {
    if (backup?.format !== 'aegis-gate2-backup/v1') throw new Error('Invalid backup format');
    const metadata = {
      format: backup.format,
      createdAt: backup.createdAt,
      kid: backup.kid,
      checksum: backup.checksum
    };
    const dek = await this.keys.unwrapDek('backup', backup.wrappedDek);
    const payload = JSON.parse(await aesDecrypt(dek, backup, canonical(metadata)));
    requireSynthetic(payload);
    if (!secureEqual(backup.checksum, sha256(payload))) throw new Error('Backup checksum failed');
    return payload;
  }
}
