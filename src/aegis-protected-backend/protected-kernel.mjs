import { BackupManager, TamperEvidentAuditLog } from './audit-backup.mjs';
import { EncryptedRecordStore } from './encrypted-record-store.mjs';
import { DeviceRegistry, SessionManager, SyntheticIdentityAdapter } from './identity-session.mjs';
import { KeyHierarchy } from './key-hierarchy.mjs';

export class ProtectedBackendKernel {
  constructor({ now = () => Date.now(), syntheticIdentityEnabled = false } = {}) {
    this.now = now;
    this.keys = new KeyHierarchy();
    this.devices = new DeviceRegistry({ now });
    this.identity = new SyntheticIdentityAdapter({ devices: this.devices, now, enabled: syntheticIdentityEnabled });
    this.sessions = new SessionManager({ keys: this.keys, devices: this.devices, now });
    this.data = new EncryptedRecordStore({ keys: this.keys, purpose: 'data', now });
    this.tokenVault = new EncryptedRecordStore({ keys: this.keys, purpose: 'token', now });
    this.audit = new TamperEvidentAuditLog({ keys: this.keys, now });
    this.backups = new BackupManager({ keys: this.keys, now });
  }

  subjectHash(userId) {
    const user = this.identity.getUser(userId);
    if (!user) throw new Error('User not found');
    return user.subjectHash;
  }

  completeSyntheticEnrollment(challengeId, credentialId) {
    const enrolled = this.identity.finishEnrollment(challengeId, credentialId);
    const scopes = ['account:delete', 'data:read', 'data:write', 'devices:manage', 'export:read'];
    const session = this.sessions.issue(enrolled.user.userId, enrolled.device.deviceId, scopes);
    this.audit.append({ subjectHash: enrolled.user.subjectHash, action: 'identity.enrolled', result: 'ok', metadata: { deviceId: enrolled.device.deviceId } });
    return { ...enrolled, session };
  }

  authorize(accessToken, scopes = []) {
    return this.sessions.verify(accessToken, scopes);
  }

  async putRecord(accessToken, recordId, value, options) {
    const session = this.authorize(accessToken, ['data:write']);
    const record = await this.data.put(session.sub, recordId, value, options);
    this.audit.append({ subjectHash: this.subjectHash(session.sub), action: 'data.write', result: 'ok', metadata: { recordId } });
    return record;
  }

  async getRecord(accessToken, recordId) {
    const session = this.authorize(accessToken, ['data:read']);
    const value = await this.data.get(session.sub, recordId);
    this.audit.append({ subjectHash: this.subjectHash(session.sub), action: 'data.read', result: value ? 'ok' : 'not-found', metadata: { recordId } });
    return value;
  }

  async getRecordForOwner(accessToken, ownerId, recordId) {
    const session = this.authorize(accessToken, ['data:read']);
    if (session.sub !== ownerId) throw new Error('Cross-user access denied');
    return this.data.get(ownerId, recordId);
  }

  revokeDevice(accessToken, deviceId) {
    const session = this.authorize(accessToken, ['devices:manage']);
    const device = this.devices.revoke(session.sub, deviceId);
    this.sessions.revokeDeviceFamilies(session.sub, deviceId);
    this.audit.append({ subjectHash: this.subjectHash(session.sub), action: 'device.revoked', result: 'ok', metadata: { deviceId } });
    return device;
  }

  async exportUser(accessToken) {
    const session = this.authorize(accessToken, ['export:read']);
    const payload = {
      synthetic: true,
      exportedAt: new Date(this.now()).toISOString(),
      records: await this.data.list(session.sub),
      devices: this.devices.list(session.sub).map(({ credentialHash, userId, ...safe }) => safe)
    };
    this.audit.append({ subjectHash: this.subjectHash(session.sub), action: 'account.exported', result: 'ok', metadata: { records: payload.records.length } });
    return payload;
  }

  async createBackup(accessToken) {
    const session = this.authorize(accessToken, ['export:read']);
    return this.backups.create({
      synthetic: true,
      ownerHash: this.subjectHash(session.sub),
      data: this.data.snapshotUser(session.sub),
      devices: this.devices.list(session.sub)
    });
  }

  async restoreBackup(accessToken, backup) {
    const session = this.authorize(accessToken, ['data:write']);
    const payload = await this.backups.restore(backup);
    if (payload.ownerHash !== this.subjectHash(session.sub)) throw new Error('Backup owner mismatch');
    this.data.restoreUser(session.sub, payload.data);
    this.audit.append({ subjectHash: this.subjectHash(session.sub), action: 'backup.restored', result: 'ok', metadata: { records: payload.data.length } });
    return true;
  }

  deleteAccount(accessToken) {
    const session = this.authorize(accessToken, ['account:delete']);
    const subjectHash = this.subjectHash(session.sub);
    this.data.deleteUser(session.sub);
    this.tokenVault.deleteUser(session.sub);
    this.sessions.deleteUser(session.sub);
    this.devices.deleteUser(session.sub);
    this.identity.deleteUser(session.sub);
    this.audit.append({ subjectHash, action: 'account.deleted', result: 'ok', metadata: { permanent: true } });
    return true;
  }
}

export function transportAllowed({ encrypted = false, forwardedProto = '', remoteAddress = '', syntheticTestMode = false, trustedProxy = false } = {}) {
  if (encrypted || (trustedProxy && String(forwardedProto).toLowerCase() === 'https')) return true;
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress);
  return syntheticTestMode && loopback;
}
