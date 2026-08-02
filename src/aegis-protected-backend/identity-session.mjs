import { createHmac } from 'node:crypto';
import { base64url, canonical, randomId, secureEqual, sha256 } from './crypto-utils.mjs';

export class DeviceRegistry {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.devices = new Map();
  }

  enroll(userId, label, credentialId) {
    const deviceId = randomId('dev');
    const device = {
      deviceId,
      userId,
      label: String(label).slice(0, 80),
      credentialHash: sha256(credentialId),
      enrolledAt: new Date(this.now()).toISOString(),
      revokedAt: null
    };
    this.devices.set(deviceId, device);
    return { ...device };
  }

  revoke(userId, deviceId) {
    const device = this.devices.get(deviceId);
    if (!device || device.userId !== userId) throw new Error('Device not found');
    if (!device.revokedAt) device.revokedAt = new Date(this.now()).toISOString();
    return { ...device };
  }

  active(userId, deviceId) {
    const device = this.devices.get(deviceId);
    return Boolean(device && device.userId === userId && !device.revokedAt);
  }

  list(userId) {
    return [...this.devices.values()].filter((device) => device.userId === userId).map((device) => ({ ...device }));
  }

  deleteUser(userId) {
    for (const [deviceId, device] of this.devices.entries()) if (device.userId === userId) this.devices.delete(deviceId);
  }
}

export class SyntheticIdentityAdapter {
  constructor({ devices, now = () => Date.now(), enabled = false } = {}) {
    this.devices = devices;
    this.now = now;
    this.enabled = enabled;
    this.challenges = new Map();
    this.users = new Map();
  }

  beginEnrollment(alias, deviceLabel) {
    if (!this.enabled) throw new Error('Synthetic identity adapter is disabled');
    const challengeId = randomId('challenge');
    this.challenges.set(challengeId, {
      alias: String(alias).slice(0, 80),
      deviceLabel: String(deviceLabel).slice(0, 80),
      expiresAt: this.now() + 120000
    });
    return { challengeId, expiresAt: new Date(this.now() + 120000).toISOString(), mode: 'synthetic-test-only' };
  }

  finishEnrollment(challengeId, credentialId) {
    if (!this.enabled) throw new Error('Synthetic identity adapter is disabled');
    const challenge = this.challenges.get(challengeId);
    this.challenges.delete(challengeId);
    if (!challenge || challenge.expiresAt <= this.now()) throw new Error('Enrollment challenge expired');
    if (typeof credentialId !== 'string' || credentialId.length < 16) throw new Error('Synthetic credential ID is invalid');
    const userId = randomId('usr');
    const user = { userId, alias: challenge.alias, subjectHash: sha256(userId) };
    this.users.set(userId, user);
    const device = this.devices.enroll(userId, challenge.deviceLabel, credentialId);
    return { user: { ...user }, device };
  }

  getUser(userId) {
    return this.users.get(userId) || null;
  }

  deleteUser(userId) {
    this.users.delete(userId);
  }
}

export class SessionManager {
  constructor({ keys, devices, now = () => Date.now(), accessTtlMs = 120000, refreshTtlMs = 3600000 } = {}) {
    this.keys = keys;
    this.devices = devices;
    this.now = now;
    this.accessTtlMs = accessTtlMs;
    this.refreshTtlMs = refreshTtlMs;
    this.families = new Map();
  }

  sign(payload) {
    const { kid, key } = this.keys.activeKey('session');
    const header = base64url(Buffer.from(canonical({ alg: 'HS256', typ: 'AEGIS-SESSION', kid })));
    const body = base64url(Buffer.from(canonical(payload)));
    const signature = createHmac('sha256', key).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verify(accessToken, requiredScopes = []) {
    const parts = String(accessToken || '').split('.');
    if (parts.length !== 3) throw new Error('Invalid access token');
    const [headerPart, bodyPart, signature] = parts;
    let header;
    let payload;
    try {
      header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(bodyPart, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Invalid access token');
    }
    const expected = createHmac('sha256', this.keys.key('session', header.kid)).update(`${headerPart}.${bodyPart}`).digest('base64url');
    if (!secureEqual(signature, expected)) throw new Error('Invalid access token signature');
    if (payload.exp <= this.now()) throw new Error('Access token expired');
    if (!this.devices.active(payload.sub, payload.deviceId)) throw new Error('Device is revoked');
    const scopes = new Set(payload.scopes || []);
    for (const scope of requiredScopes) if (!scopes.has(scope)) throw new Error(`Missing scope: ${scope}`);
    return payload;
  }

  issue(userId, deviceId, scopes) {
    if (!this.devices.active(userId, deviceId)) throw new Error('Device is not active');
    const familyId = randomId('family');
    const refreshSecret = randomId('refresh');
    const now = this.now();
    this.families.set(familyId, {
      familyId,
      userId,
      deviceId,
      scopes: [...new Set(scopes)].sort(),
      currentHash: sha256(refreshSecret),
      usedHashes: new Set(),
      expiresAt: now + this.refreshTtlMs,
      revokedAt: null
    });
    return this.buildPair(this.families.get(familyId), refreshSecret);
  }

  buildPair(family, refreshSecret) {
    const now = this.now();
    const payload = {
      iss: 'aegis-protected-backend',
      sub: family.userId,
      deviceId: family.deviceId,
      familyId: family.familyId,
      jti: randomId('jti'),
      iat: now,
      exp: now + this.accessTtlMs,
      scopes: family.scopes
    };
    return {
      accessToken: this.sign(payload),
      accessExpiresAt: new Date(payload.exp).toISOString(),
      refreshToken: `${family.familyId}.${refreshSecret}`,
      refreshExpiresAt: new Date(family.expiresAt).toISOString()
    };
  }

  rotate(refreshToken) {
    const [familyId, ...secretParts] = String(refreshToken || '').split('.');
    const secret = secretParts.join('.');
    const family = this.families.get(familyId);
    if (!family || !secret) throw new Error('Invalid refresh token');
    const presentedHash = sha256(secret);
    if (family.usedHashes.has(presentedHash)) {
      family.revokedAt = new Date(this.now()).toISOString();
      throw new Error('Refresh token replay detected; family revoked');
    }
    if (family.revokedAt) throw new Error('Refresh token family revoked');
    if (family.expiresAt <= this.now()) throw new Error('Refresh token expired');
    if (!this.devices.active(family.userId, family.deviceId)) throw new Error('Device is revoked');
    if (!secureEqual(presentedHash, family.currentHash)) throw new Error('Invalid refresh token');
    family.usedHashes.add(family.currentHash);
    const nextSecret = randomId('refresh');
    family.currentHash = sha256(nextSecret);
    return this.buildPair(family, nextSecret);
  }

  revokeDeviceFamilies(userId, deviceId) {
    for (const family of this.families.values()) {
      if (family.userId === userId && family.deviceId === deviceId && !family.revokedAt) {
        family.revokedAt = new Date(this.now()).toISOString();
      }
    }
  }

  deleteUser(userId) {
    for (const [familyId, family] of this.families.entries()) if (family.userId === userId) this.families.delete(familyId);
  }
}
