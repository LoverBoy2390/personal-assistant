import { randomBytes } from 'node:crypto';
import { assertPurpose, aesDecrypt, aesEncrypt, base64url, canonical, fromBase64url } from './crypto-utils.mjs';

export class KeyHierarchy {
  constructor() {
    this.keys = new Map();
    this.active = new Map();
    for (const purpose of ['session', 'data', 'token', 'audit', 'backup']) this.rotate(purpose);
  }

  rotate(purpose) {
    assertPurpose(purpose);
    const kid = `${purpose}-v${(this.keys.get(purpose)?.size || 0) + 1}`;
    const purposeKeys = this.keys.get(purpose) || new Map();
    purposeKeys.set(kid, randomBytes(32));
    this.keys.set(purpose, purposeKeys);
    this.active.set(purpose, kid);
    return kid;
  }

  activeKey(purpose) {
    assertPurpose(purpose);
    const kid = this.active.get(purpose);
    return { kid, key: this.keys.get(purpose).get(kid) };
  }

  key(purpose, kid) {
    assertPurpose(purpose);
    const key = this.keys.get(purpose)?.get(kid);
    if (!key) throw new Error(`Unknown ${purpose} key: ${kid}`);
    return key;
  }

  describe() {
    return Object.freeze(Object.fromEntries(
      [...this.active.entries()].map(([purpose, kid]) => [purpose, { activeKid: kid, versions: this.keys.get(purpose).size }])
    ));
  }

  async wrapDek(purpose, dek) {
    const { kid, key } = this.activeKey(purpose);
    const aad = canonical({ type: 'aegis-dek-wrap/v1', purpose, kid });
    const encrypted = await aesEncrypt(key, base64url(dek), aad);
    return { format: 'aegis-dek-wrap/v1', purpose, kid, ...encrypted };
  }

  async unwrapDek(purpose, wrapped) {
    if (wrapped?.format !== 'aegis-dek-wrap/v1' || wrapped.purpose !== purpose) {
      throw new Error('Invalid wrapped data key');
    }
    const aad = canonical({ type: wrapped.format, purpose, kid: wrapped.kid });
    return fromBase64url(await aesDecrypt(this.key(purpose, wrapped.kid), wrapped, aad));
  }
}
