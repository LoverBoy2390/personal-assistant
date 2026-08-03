import { SYNTHETIC_DATASET } from '../aegis-synthetic-coach/fixtures.mjs';
import { createAuditLog, generateDailyBrief, searchTimeline } from '../aegis-synthetic-coach/coach-engine.mjs';

const state = {
  permissions: { ...SYNTHETIC_DATASET.permissions },
  activeView: 'overview',
  audit: createAuditLog(),
  expandedEvidence: new Set()
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function icon(domain) {
  return ({ tasks: '✓', calendar: '◷', finance: '$', wellness: '◇', system: '◎' })[domain] || '•';
}

function confidencePercent(value) {
  return `${Math.round(value * 100)}%`;
}

function vaultState() {
  try {
    return window.__AEGIS_VAULT_TEST__?.status?.().status || 'loading';
  } catch {
    return 'unavailable';
  }
}

function runtimeState() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const worker = window.__AEGIS_SW_STATE__ || { status: 'loading', workerState: null };
  return {
    standalone,
    vault: vaultState(),
    serviceWorker: worker.status,
    workerState: worker.workerState || 'pending'
  };
}

function renderRecommendation(card) {
  const expanded = state.expandedEvidence.has(card.id);
  const evidence = card.evidence.map((item) => `
    <li>
      <strong>${escapeHtml(item.sourceLabel)}</strong>
      <span>${escapeHtml(item.fact)}</span>
      <small>${escapeHtml(item.observedAt)}</small>
    </li>`).join('');
  const unknowns = card.unknowns.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `
    <article class="signal-card priority-${escapeHtml(card.priority)}">
      <div class="card-kicker"><span>${icon(card.domain)} ${escapeHtml(card.domain)}</span><span>${escapeHtml(card.priority)}</span></div>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.summary)}</p>
      <div class="confidence"><span>Confidence</span><strong>${escapeHtml(card.confidenceLabel)} · ${confidencePercent(card.confidence)}</strong></div>
      <button class="ghost-button evidence-button" data-id="${escapeHtml(card.id)}">${expanded ? 'Hide' : 'Review'} evidence</button>
      <div class="evidence-panel ${expanded ? 'open' : ''}">
        <h4>Observed facts</h4><ul>${evidence}</ul>
        <h4>Inference</h4><p>${escapeHtml(card.inference)}</p>
        <h4>Unknowns</h4><ul>${unknowns}</ul>
        <div class="policy-chip">Advisory only · no message, purchase, transfer, deletion, or account change is authorized</div>
      </div>
    </article>`;
}

function renderStatusGrid() {
  const runtime = runtimeState();
  const vaultLabel = runtime.vault === 'unlocked' ? 'Unlocked' : runtime.vault === 'locked' ? 'Locked' : 'Not created';
  return `
    <section class="system-grid" aria-label="Champion safety status">
      <article class="status-card"><small>External accounts</small><strong class="safe">0 connected</strong></article>
      <article class="status-card"><small>Paid cloud services</small><strong class="safe">$0 enabled</strong></article>
      <article class="status-card"><small>Cloud synchronization</small><strong class="safe">Off</strong></article>
      <article class="status-card"><small>Encrypted local vault</small><strong class="${runtime.vault === 'unlocked' ? 'safe' : 'locked'}">${escapeHtml(vaultLabel)}</strong></article>
    </section>`;
}

function renderOverview() {
  const brief = generateDailyBrief(SYNTHETIC_DATASET, state.permissions);
  const recommendations = brief.recommendations.map(renderRecommendation).join('');
  const sources = brief.sourceSummary.map((source) => `
    <div class="source-row">
      <span class="source-icon">${icon(source.domain)}</span>
      <div><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.observedAt)}</small></div>
      <span class="source-confidence">${confidencePercent(source.confidence)}</span>
    </div>`).join('') || '<p class="empty-state">All synthetic domains are disabled.</p>';
  const best = brief.bestNextAction;

  $('#overview-view').innerHTML = `
    <section class="hero-grid">
      <div>
        <p class="eyebrow">AEGIS Champion · Local Core v0.8.0</p>
        <h1>Good morning, Champion.</h1>
        <p class="hero-copy">This is the controlled local foundation for your personal operating system. Every recommendation separates observed facts, inference, confidence, and unknowns.</p>
        <div class="hero-actions">
          <button id="regenerate-button" class="primary-button">Regenerate synthetic brief</button>
          <span class="privacy-note">No external network · no connected accounts · no paid services</span>
        </div>
      </div>
      <div class="orb" aria-hidden="true"><span>CHAMPION</span></div>
    </section>

    <section class="champion-intro"><p><strong>Review boundary:</strong> Use synthetic data only. The local encrypted vault is under security review and is not approved for real personal, financial, health, email, calendar, or credential data.</p></section>
    ${renderStatusGrid()}

    <section class="dashboard-grid">
      <div class="panel signals-panel">
        <div class="panel-heading"><div><p class="eyebrow">Coach signals</p><h2>What deserves attention</h2></div><span>${brief.recommendations.length}</span></div>
        <div class="signal-list">${recommendations || '<p class="empty-state">No enabled synthetic source currently produces a recommendation.</p>'}</div>
      </div>
      <aside class="panel source-panel">
        <div class="panel-heading"><div><p class="eyebrow">Evidence</p><h2>Source health</h2></div></div>
        <div class="source-list">${sources}</div>
        <div class="guardrail-card"><strong>Locked guardrail</strong><p>Champion can explain and recommend. It cannot execute consequential actions in this build.</p></div>
      </aside>
    </section>

    <section class="best-action ${best ? '' : 'empty'}">
      <div><p class="eyebrow">Best next action</p><h2>${best ? escapeHtml(best.title) : 'No action recommended'}</h2><p>${best ? escapeHtml(best.summary) : 'Enable a synthetic domain to generate a demo recommendation.'}</p></div>
      <div class="best-action-meta">${best ? `${escapeHtml(best.priority)} · ${confidencePercent(best.confidence)}` : 'synthetic-only'}</div>
    </section>`;

  $('#regenerate-button')?.addEventListener('click', () => {
    state.audit.record('Generated Champion synthetic daily brief', { domain: 'system', targetId: SYNTHETIC_DATASET.datasetId });
    renderOverview();
  });
  document.querySelectorAll('.evidence-button').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.id;
    state.expandedEvidence.has(id) ? state.expandedEvidence.delete(id) : state.expandedEvidence.add(id);
    state.audit.record('Reviewed recommendation evidence', { domain: 'system', targetId: id });
    renderOverview();
  }));
}

function renderTimeline(query = '') {
  const rows = searchTimeline(SYNTHETIC_DATASET, query, state.permissions);
  const items = rows.map((row) => `
    <article class="timeline-row">
      <span class="timeline-icon">${icon(row.domain)}</span>
      <div><p class="eyebrow">${escapeHtml(row.domain)}</p><h3>${escapeHtml(row.title)}</h3><p>${escapeHtml(row.detail)}</p></div>
      <time>${escapeHtml(row.at)}</time>
    </article>`).join('') || '<p class="empty-state">No synthetic timeline entries match this search.</p>';
  $('#timeline-view').innerHTML = `
    <section class="view-heading"><p class="eyebrow">Searchable timeline</p><h1>Trace every signal.</h1><p>Searches only the in-memory synthetic fixture. Nothing is uploaded, connected, or silently saved.</p></section>
    <div class="search-shell"><input id="timeline-search" type="search" placeholder="Search synthetic tasks, calendar, finance, wellness" value="${escapeHtml(query)}"><span>${rows.length} result${rows.length === 1 ? '' : 's'}</span></div>
    <section class="timeline-list">${items}</section>`;
  $('#timeline-search')?.addEventListener('input', (event) => renderTimeline(event.target.value));
}

function renderPermissions() {
  const labels = {
    calendar: ['Synthetic Calendar', 'Demo event titles and times'],
    tasks: ['Synthetic Tasks', 'Demo task titles, priorities, and due times'],
    finance: ['Synthetic Financial Snapshot', 'Demo balances and seven-day projection'],
    wellness: ['Synthetic Wellness', 'Demo sleep, hydration, and movement']
  };
  const cards = Object.entries(labels).map(([domain, [title, detail]]) => `
    <article class="permission-card">
      <div class="permission-icon">${icon(domain)}</div>
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p><small>In-memory only · advisory access</small></div>
      <label class="switch"><input type="checkbox" data-domain="${domain}" ${state.permissions[domain] ? 'checked' : ''}><span></span></label>
    </article>`).join('');
  $('#permissions-view').innerHTML = `
    <section class="view-heading"><p class="eyebrow">Permission dashboard</p><h1>You control every domain.</h1><p>These switches affect only the included synthetic fixture and reset when the page reloads.</p></section>
    <section class="permission-grid">${cards}</section>
    <section class="boundary-panel"><h2>Real connections remain locked</h2><p>OAuth, provider tokens, Gmail, real calendars, bank accounts, health records, background synchronization, and autonomous actions are prohibited in this build.</p></section>`;
  document.querySelectorAll('.switch input').forEach((input) => input.addEventListener('change', () => {
    const domain = input.dataset.domain;
    state.permissions[domain] = input.checked;
    state.audit.record(input.checked ? 'Enabled synthetic domain' : 'Disabled synthetic domain', { domain, targetId: domain });
    renderPermissions();
  }));
}

function renderAudit() {
  const entries = state.audit.list();
  const rows = entries.map((entry) => `
    <article class="audit-row"><span>${icon(entry.domain)}</span><div><h3>${escapeHtml(entry.event)}</h3><p>${escapeHtml(entry.domain)} · ${escapeHtml(entry.result)}</p></div><time>${escapeHtml(entry.at)}</time></article>`).join('') || '<p class="empty-state">No synthetic session activity has been recorded yet.</p>';
  $('#audit-view').innerHTML = `
    <section class="view-heading"><p class="eyebrow">Audit history</p><h1>Visible session activity.</h1><p>The session log records minimized event metadata only. It does not store source payloads, recommendation evidence, passphrases, or credentials.</p></section>
    <div class="audit-toolbar"><span>${entries.length} session event${entries.length === 1 ? '' : 's'}</span><button id="clear-audit" class="ghost-button">Clear session audit</button></div>
    <section class="audit-list">${rows}</section>`;
  $('#clear-audit')?.addEventListener('click', () => {
    state.audit.clear();
    renderAudit();
  });
}

function renderSystem() {
  const runtime = runtimeState();
  const installed = runtime.standalone ? 'Standalone' : 'Browser review';
  const workerReady = runtime.serviceWorker === 'registered' ? 'Registered' : escapeHtml(runtime.serviceWorker);
  $('#system-view').innerHTML = `
    <section class="view-heading"><p class="eyebrow">System control</p><h1>Secure, visible, and local.</h1><p>This screen states exactly what the build can and cannot do. No cloud capability is implied.</p></section>
    ${renderStatusGrid()}
    <section class="system-section">
      <h2>Runtime readiness</h2>
      <p>These checks describe the current browser session. They do not certify the application for personal data.</p>
      <div class="readiness-grid">
        <article class="readiness-card"><small>Display mode</small><strong class="safe">${escapeHtml(installed)}</strong></article>
        <article class="readiness-card"><small>Service worker</small><strong class="safe">${workerReady}</strong></article>
        <article class="readiness-card"><small>Worker lifecycle</small><strong class="safe">${escapeHtml(runtime.workerState)}</strong></article>
        <article class="readiness-card"><small>Vault state</small><strong class="locked">${escapeHtml(runtime.vault)}</strong></article>
      </div>
    </section>
    <section class="system-section">
      <h2>Locked boundaries</h2>
      <div class="system-list">
        <article><span>✓</span><div><strong>External network disabled</strong><small>Content Security Policy blocks runtime connections.</small></div><span class="system-state">Locked</span></article>
        <article><span>✓</span><div><strong>No AWS runtime</strong><small>No AWS SDK, credential, organization, resource, or deployment path is included.</small></div><span class="system-state">Locked</span></article>
        <article><span>✓</span><div><strong>No real accounts</strong><small>No OAuth, provider token, email, bank, calendar, health, or messaging connection.</small></div><span class="system-state">Locked</span></article>
        <article><span>✓</span><div><strong>No consequential actions</strong><small>No purchases, transfers, messages, deletions, or account changes.</small></div><span class="system-state">Locked</span></article>
      </div>
    </section>`;
}

function render() {
  document.querySelectorAll('.view').forEach((view) => { view.hidden = true; });
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === state.activeView));
  const view = $(`#${state.activeView}-view`);
  if (!view) return;
  view.hidden = false;
  if (state.activeView === 'overview') renderOverview();
  if (state.activeView === 'timeline') renderTimeline();
  if (state.activeView === 'permissions') renderPermissions();
  if (state.activeView === 'audit') renderAudit();
  if (state.activeView === 'system') renderSystem();
}

document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => {
  state.activeView = button.dataset.view;
  state.audit.record('Changed Champion view', { domain: 'system', targetId: state.activeView });
  render();
}));

state.audit.record('Opened AEGIS Champion Local Core', { domain: 'system', targetId: SYNTHETIC_DATASET.datasetId });
render();
window.__AEGIS_CHAMPION_READY__ = true;
