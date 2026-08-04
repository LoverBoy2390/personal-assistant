export const $ = (selector) => document.querySelector(selector);

export const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export function icon(domain) {
  return ({ tasks: '✓', calendar: '◷', finance: '$', wellness: '◇', system: '◎' })[domain] || '•';
}

export function confidencePercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function runtimeState() {
  let vault = 'loading';
  try { vault = window.__AEGIS_VAULT_TEST__?.status?.().status || 'loading'; }
  catch { vault = 'unavailable'; }
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const worker = window.__AEGIS_SW_STATE__ || { status: 'loading', workerState: null };
  return { standalone, vault, serviceWorker: worker.status, workerState: worker.workerState || 'pending' };
}

export function renderStatusGrid() {
  const runtime = runtimeState();
  const vaultLabel = runtime.vault === 'unlocked' ? 'Unlocked' : runtime.vault === 'locked' ? 'Locked' : 'Not created';
  return `<section class="system-grid" aria-label="Champion safety status">
    <article class="status-card"><small>External accounts</small><strong class="safe">0 connected</strong></article>
    <article class="status-card"><small>Paid cloud services</small><strong class="safe">$0 enabled</strong></article>
    <article class="status-card"><small>Cloud synchronization</small><strong class="safe">Off</strong></article>
    <article class="status-card"><small>Encrypted local vault</small><strong class="${runtime.vault === 'unlocked' ? 'safe' : 'locked'}">${escapeHtml(vaultLabel)}</strong></article>
  </section>`;
}

export function metricCard(label, value, unit, status, className = '') {
  return `<article class="heart-metric ${className}">
    <small>${label}</small><strong>${value}<span>${unit}</span></strong>
    <div class="metric-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><em>${status}</em>
  </article>`;
}

export function renderRecommendation(card, expanded) {
  const evidence = card.evidence.map((item) => `<li><strong>${escapeHtml(item.sourceLabel)}</strong><span>${escapeHtml(item.fact)}</span><small>${escapeHtml(item.observedAt)}</small></li>`).join('');
  const unknowns = card.unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<article class="signal-card priority-${escapeHtml(card.priority)}">
    <div class="card-kicker"><span>${icon(card.domain)} ${escapeHtml(card.domain)}</span><span>${escapeHtml(card.priority)}</span></div>
    <h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.summary)}</p>
    <div class="confidence"><span>Confidence</span><strong>${escapeHtml(card.confidenceLabel)} · ${confidencePercent(card.confidence)}</strong></div>
    <button class="ghost-button evidence-button" data-id="${escapeHtml(card.id)}">${expanded ? 'Hide' : 'See why'}</button>
    <div class="evidence-panel ${expanded ? 'open' : ''}"><h4>Observed facts</h4><ul>${evidence}</ul><h4>Champion's inference</h4><p>${escapeHtml(card.inference)}</p><h4>Still unknown</h4><ul>${unknowns}</ul><div class="policy-chip">Advisory only · no message, purchase, transfer, deletion, or account change is authorized</div></div>
  </article>`;
}
