import {
  createEncryptedEnvelope,
  decryptEnvelope,
  exportEncryptedBackup,
  replaceEncryptedPayload,
  restoreWithRollback
} from './vault-core.mjs';
import {
  createLifecycleRuntime,
  deleteEncryptedEnvelope,
  loadEncryptedEnvelope,
  saveEncryptedEnvelope,
  VAULT_STORAGE_INFO
} from './vault-browser.mjs';

const root = document.querySelector('#vault-view');
const state = {
  envelope: null,
  payload: null,
  passphrase: null,
  notice: '',
  applyingPermissions: false
};

const runtime = createLifecycleRuntime({
  timeoutMs: 5 * 60 * 1000,
  onLock: (reason) => lockInMemory(reason, false)
});

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function vaultStatus() {
  if (!state.envelope) return 'not-created';
  return state.payload ? 'unlocked' : 'locked';
}

function updateChrome() {
  const status = vaultStatus();
  const label = document.querySelector('#vault-status');
  if (label) label.textContent = status === 'unlocked' ? 'Encrypted vault unlocked' : status === 'locked' ? 'Encrypted vault locked' : 'No vault created';
  document.body.dataset.vaultStatus = status;
}

function currentPermissions() {
  const result = {};
  for (const domain of ['calendar', 'tasks', 'finance', 'wellness']) {
    const input = document.querySelector(`.switch input[data-domain="${domain}"]`);
    if (input) result[domain] = input.checked;
  }
  return result;
}

function activeViewName() {
  return document.querySelector('.nav-button.active')?.dataset.view || 'overview';
}

function clickView(name) {
  document.querySelector(`.nav-button[data-view="${name}"]`)?.click();
}

function applySavedPermissions(permissions = {}) {
  state.applyingPermissions = true;
  const previous = activeViewName();
  clickView('permissions');
  for (const domain of ['calendar', 'tasks', 'finance', 'wellness']) {
    const input = document.querySelector(`.switch input[data-domain="${domain}"]`);
    if (input && typeof permissions[domain] === 'boolean' && input.checked !== permissions[domain]) input.click();
  }
  if (previous !== 'permissions') clickView(previous);
  state.applyingPermissions = false;
}

function emptyPayload() {
  return {
    synthetic: true,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    preferences: { permissions: currentPermissions() },
    corrections: [],
    vaultAudit: [],
    retention: { policy: 'until-manual-delete', content: 'synthetic preferences and corrections only' }
  };
}

function auditVault(event, result = 'ok') {
  if (!state.payload) return;
  const entry = { at: new Date().toISOString(), event: String(event).slice(0, 80), result: String(result).slice(0, 40) };
  state.payload.vaultAudit = [entry, ...(state.payload.vaultAudit || [])].slice(0, 100);
}

async function persistPayload(event) {
  if (!state.payload || !state.passphrase || !state.envelope) return;
  auditVault(event);
  state.envelope = await replaceEncryptedPayload(state.passphrase, state.envelope, state.payload);
  await saveEncryptedEnvelope(state.envelope);
  updateChrome();
}

function lockInMemory(reason = 'manual', broadcast = true) {
  state.payload = null;
  state.passphrase = null;
  state.notice = `Vault locked: ${reason}.`;
  if (runtime.status().unlocked) runtime.lock(reason, broadcast);
  updateChrome();
  renderVault();
  refreshCorrectionControls();
}

async function createVault(passphrase) {
  const payload = emptyPayload();
  const envelope = await createEncryptedEnvelope(passphrase, payload);
  await saveEncryptedEnvelope(envelope);
  state.envelope = envelope;
  state.payload = payload;
  state.passphrase = passphrase;
  runtime.unlock();
  auditVault('Created encrypted synthetic vault');
  await persistPayload('Initialized vault controls');
  state.notice = 'Encrypted synthetic vault created.';
  updateChrome();
  renderVault();
}

async function unlockVault(passphrase) {
  const payload = await decryptEnvelope(passphrase, state.envelope);
  state.payload = payload;
  state.passphrase = passphrase;
  runtime.unlock();
  state.notice = 'Vault unlocked locally.';
  applySavedPermissions(payload.preferences?.permissions || {});
  updateChrome();
  renderVault();
  refreshCorrectionControls();
}

async function deleteVault() {
  await deleteEncryptedEnvelope();
  state.envelope = null;
  state.payload = null;
  state.passphrase = null;
  runtime.lock('deleted', true);
  state.notice = 'Encrypted vault deleted from this browser.';
  updateChrome();
  renderVault();
  refreshCorrectionControls();
}

function downloadBackup(text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aegis-synthetic-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function correctionFor(id) {
  return state.payload?.corrections?.find((item) => item.targetId === id) || null;
}

async function recordCorrection(targetId, verdict) {
  if (!state.payload) {
    state.notice = 'Unlock the encrypted synthetic vault before saving a correction.';
    clickView('vault');
    renderVault();
    return;
  }
  const next = (state.payload.corrections || []).filter((item) => item.targetId !== targetId);
  next.unshift({ targetId, verdict, at: new Date().toISOString() });
  state.payload.corrections = next.slice(0, 100);
  await persistPayload('Saved recommendation correction');
  refreshCorrectionControls();
}

function refreshCorrectionControls() {
  for (const button of document.querySelectorAll('.evidence-button[data-id]')) {
    const id = button.dataset.id;
    const panel = button.parentElement?.querySelector('.evidence-panel');
    if (!panel || panel.querySelector(`[data-correction-shell="${CSS.escape(id)}"]`)) continue;
    const shell = document.createElement('div');
    shell.className = 'correction-shell';
    shell.dataset.correctionShell = id;
    shell.innerHTML = `<span>Correction</span><button type="button" data-verdict="accurate">Accurate</button><button type="button" data-verdict="needs-correction">Needs correction</button><small></small>`;
    panel.append(shell);
    shell.addEventListener('click', (event) => {
      const verdict = event.target?.dataset?.verdict;
      if (verdict) recordCorrection(id, verdict).catch(showError);
    });
  }
  for (const shell of document.querySelectorAll('.correction-shell')) {
    const saved = correctionFor(shell.dataset.correctionShell);
    const small = shell.querySelector('small');
    if (small) small.textContent = saved ? `Saved: ${saved.verdict}` : state.payload ? 'Not reviewed' : 'Unlock vault to save';
  }
}

function showError(error) {
  state.notice = error?.message || 'Vault operation failed.';
  renderVault();
}

function renderVault() {
  if (!root) return;
  const status = vaultStatus();
  const notice = state.notice ? `<div class="vault-notice" role="status">${escapeHtml(state.notice)}</div>` : '';
  const details = state.envelope ? `<dl class="vault-metadata"><div><dt>Format</dt><dd>${escapeHtml(state.envelope.format)}</dd></div><div><dt>Revision</dt><dd>${state.envelope.revision}</dd></div><div><dt>Updated</dt><dd>${escapeHtml(state.envelope.updatedAt)}</dd></div><div><dt>Storage</dt><dd>${escapeHtml(VAULT_STORAGE_INFO.content)}</dd></div></dl>` : '';
  let controls;
  if (status === 'not-created') {
    controls = `<form id="create-vault-form" class="vault-form"><label>New passphrase<input id="new-passphrase" type="password" minlength="12" autocomplete="new-password" required></label><label>Confirm passphrase<input id="confirm-passphrase" type="password" minlength="12" autocomplete="new-password" required></label><button class="primary-button" type="submit">Create encrypted synthetic vault</button><p>AEGIS cannot recover this passphrase. Use only synthetic data in this prototype.</p></form>`;
  } else if (status === 'locked') {
    controls = `<form id="unlock-vault-form" class="vault-form"><label>Vault passphrase<input id="unlock-passphrase" type="password" minlength="12" autocomplete="current-password" required></label><button class="primary-button" type="submit">Unlock locally</button><p>Five-minute inactivity, page exit, hidden-page, BFCache restore, and another-tab lock events clear decrypted data from memory.</p></form>`;
  } else {
    const corrections = (state.payload.corrections || []).map((item) => `<li><strong>${escapeHtml(item.targetId)}</strong><span>${escapeHtml(item.verdict)}</span><time>${escapeHtml(item.at)}</time></li>`).join('') || '<li>No saved corrections.</li>';
    controls = `<div class="vault-actions"><button id="lock-vault" class="primary-button">Lock now</button><button id="export-vault" class="ghost-button">Export encrypted backup</button><label class="file-button">Restore encrypted backup<input id="restore-vault" type="file" accept="application/json,.json"></label><button id="delete-vault" class="danger-button">Delete encrypted vault</button></div><section class="vault-subpanel"><h2>Retention and deletion</h2><p>Encrypted synthetic preferences and corrections remain in this browser until you delete the vault. No provider data or token is stored.</p></section><section class="vault-subpanel"><h2>Correction history</h2><ul class="correction-list">${corrections}</ul></section>`;
  }
  root.innerHTML = `<section class="view-heading"><p class="eyebrow">Encrypted synthetic vault</p><h1>Local control before connection.</h1><p>This prototype encrypts only synthetic preferences and correction history using AES-256-GCM with a PBKDF2-derived key. It is not approved for personal data.</p></section><section class="vault-panel"><div class="vault-heading"><div><span class="vault-state vault-state-${status}">${escapeHtml(status)}</span><h2>Vault lifecycle</h2></div><span>Zero connected accounts</span></div>${notice}${details}${controls}</section><section class="boundary-panel"><h2>Security boundary</h2><p>No recovery service, identity provider, backend, synchronization, token vault, or real-data storage exists in this phase. Losing the passphrase makes the encrypted demo vault unrecoverable.</p></section>`;

  document.querySelector('#create-vault-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const first = document.querySelector('#new-passphrase').value;
    const second = document.querySelector('#confirm-passphrase').value;
    if (first !== second) return showError(new Error('Passphrases do not match'));
    createVault(first).catch(showError);
  });
  document.querySelector('#unlock-vault-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    unlockVault(document.querySelector('#unlock-passphrase').value).catch(showError);
  });
  document.querySelector('#lock-vault')?.addEventListener('click', () => lockInMemory('manual', true));
  document.querySelector('#export-vault')?.addEventListener('click', () => exportEncryptedBackup(state.envelope).then(downloadBackup).catch(showError));
  document.querySelector('#restore-vault')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file || !state.passphrase) return;
    if (file.size > 2000000) {
      state.notice = 'Restore rejected; backup exceeds the 2 MB synthetic-vault limit.';
      renderVault();
      return;
    }
    const result = await restoreWithRollback({ currentEnvelope: state.envelope, backupText: await file.text(), passphrase: state.passphrase });
    if (!result.ok) {
      state.notice = `Restore rejected; current encrypted vault preserved. ${result.error}`;
      renderVault();
      return;
    }
    state.envelope = result.activeEnvelope;
    state.payload = result.payload;
    await saveEncryptedEnvelope(state.envelope);
    state.notice = 'Encrypted backup restored after checksum and unlock verification.';
    applySavedPermissions(state.payload.preferences?.permissions || {});
    renderVault();
  });
  document.querySelector('#delete-vault')?.addEventListener('click', () => deleteVault().catch(showError));
}

document.addEventListener('change', (event) => {
  if (state.applyingPermissions || !event.target?.matches?.('.switch input[data-domain]') || !state.payload) return;
  queueMicrotask(() => {
    state.payload.preferences = { ...(state.payload.preferences || {}), permissions: currentPermissions() };
    persistPayload('Updated synthetic permission preference').catch(showError);
  });
});

const observer = new MutationObserver(refreshCorrectionControls);
observer.observe(document.documentElement, { childList: true, subtree: true });

state.envelope = await loadEncryptedEnvelope();
updateChrome();
renderVault();
refreshCorrectionControls();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

window.__AEGIS_VAULT_TEST__ = Object.freeze({
  status: () => ({ status: vaultStatus(), envelope: state.envelope, payload: state.payload }),
  create: createVault,
  unlock: unlockVault,
  lock: (reason = 'test') => lockInMemory(reason, true),
  forceTimeout: () => runtime.forceTimeoutForTest(),
  rawEnvelopeText: () => JSON.stringify(state.envelope),
  delete: deleteVault,
  storageInfo: VAULT_STORAGE_INFO
});
window.__AEGIS_VAULT_READY__ = true;
