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

function sourceFor(brief, domain) {
  return brief.sourceSummary.find((source) => source.domain === domain);
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
      <button class="ghost-button evidence-button" data-id="${escapeHtml(card.id)}">${expanded ? 'Hide' : 'See why'}</button>
      <div class="evidence-panel ${expanded ? 'open' : ''}">
        <h4>Observed facts</h4><ul>${evidence}</ul>
        <h4>Champion's inference</h4><p>${escapeHtml(card.inference)}</p>
        <h4>Still unknown</h4><ul>${unknowns}</ul>
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

function renderTrustRibbon() {
  return `
    <div class="hero-trust" aria-label="Local trust summary">
      <span>External accounts: 0 connected</span>
      <span>Paid services: $0 enabled</span>
      <span>Cloud synchronization: Off</span>
      <span>External network blocked</span>
    </div>`;
}

function renderDailyPulse(brief) {
  const timelineCount = searchTimeline(SYNTHETIC_DATASET, '', state.permissions).length;
  const best = brief.bestNextAction;
  const finance = sourceFor(brief, 'finance');
  const wellness = sourceFor(brief, 'wellness');
  return `
    <section class="daily-pulse" aria-label="Synthetic day at a glance">
      <article class="pulse-card">
        <span class="pulse-icon">◷</span>
        <small>Today</small>
        <strong>${timelineCount} moments</strong>
        <span>Your synthetic day is gathered into one calm timeline.</span>
      </article>
      <article class="pulse-card">
        <span class="pulse-icon">✓</span>
        <small>Focus</small>
        <strong>${best ? escapeHtml(best.priority) : 'Clear'}</strong>
        <span>${best ? 'One next move is ready.' : 'No synthetic action is pressing.'}</span>
      </article>
      <article class="pulse-card">
        <span class="pulse-icon">$</span>
        <small>Balance</small>
        <strong>${finance ? confidencePercent(finance.confidence) : 'Paused'}</strong>
        <span>Synthetic financial signal health, never a real balance.</span>
      </article>
      <article class="pulse-card">
        <span class="pulse-icon">◇</span>
        <small>Recovery</small>
        <strong>${wellness ? confidencePercent(wellness.confidence) : 'Paused'}</strong>
        <span>Synthetic wellness signal health, shown without judgment.</span>
      </article>
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
    </div>`).join('') || '<p class="empty-state">All synthetic domains are resting.</p>';
  const best = brief.bestNextAction;

  $('#overview-view').innerHTML = `
    <div class="home-shell">
      <section class="home-hero">
        <div class="home-welcome">
          <div class="presence-line"><span></span>Champion is present on this device</div>
          <p class="eyebrow">Welcome home</p>
          <h1>Good morning, Champion.<em>Your day, held together.</em></h1>
          <p class="hero-copy">This should feel less like another dashboard and more like a steady place to land. Champion gathers the signal, explains what it sees, and offers one clear next move.</p>
          <div class="hero-actions">
            <button id="regenerate-button" class="primary-button">Refresh today's guidance</button>
            <button id="shield-button" class="ghost-button">Open the Shield Room</button>
          </div>
          ${renderTrustRibbon()}
        </div>

        <div class="champion-presence" aria-label="Animated Champion presence">
          <div class="core-halo"></div>
          <div class="core-ring"></div>
          <div class="core-ring ring-two"></div>
          <div class="core-ring ring-three"></div>
          <div class="core">
            <div class="core-label"><strong>AEGIS</strong><small>LISTENING LOCALLY</small></div>
          </div>
          <div class="presence-caption">Quiet, local, and waiting for your direction.</div>
        </div>
      </section>

      <section class="next-move">
        <div>
          <p class="eyebrow">Best next action</p>
          <h2>${best ? escapeHtml(best.title) : 'Nothing needs your attention right now'}</h2>
          <p>${best ? escapeHtml(best.summary) : 'Enable a synthetic domain when you are ready to continue the demo.'}</p>
        </div>
        <div class="next-orbit">${best ? confidencePercent(best.confidence) : 'CALM'}</div>
      </section>

      ${renderDailyPulse(brief)}

      <section class="home-content-grid">
        <div class="companion-panel">
          <div class="section-heading">
            <div><p class="eyebrow">Champion insight</p><h2>What I notice</h2></div>
            <span class="count-bubble">${brief.recommendations.length}</span>
          </div>
          <div class="signal-list">${recommendations || '<p class="empty-state">No enabled synthetic source currently produces a recommendation.</p>'}</div>
        </div>

        <aside class="quiet-panel">
          <div class="section-heading"><div><p class="eyebrow">Quiet confidence</p><h2>What supports it</h2></div></div>
          <div class="source-list">${sources}</div>
          <div class="guardrail-card"><strong>You remain in control</strong><p>Champion can explain and recommend. It cannot execute consequential actions in this build.</p></div>
          <div class="trust-note"><span>◇</span><div><strong>Review boundary</strong><br>This local encrypted vault is not approved for real personal, financial, health, email, calendar, or credential data.</div></div>
        </aside>
      </section>
    </div>`;

  $('#regenerate-button')?.addEventListener('click', () => {
    state.audit.record('Generated Champion synthetic daily brief', { domain: 'system', targetId: SYNTHETIC_DATASET.datasetId });
    renderOverview();
    animateActiveView();
  });
  $('#shield-button')?.addEventListener('click', () => changeView('system'));
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
    <section class="view-heading"><p class="eyebrow">My day</p><h1>Everything in one gentle flow.</h1><p>Searches only the in-memory synthetic fixture. Nothing is uploaded, connected, or silently saved.</p></section>
    <div class="search-shell"><input id="timeline-search" type="search" placeholder="Search synthetic tasks, calendar, balance, or recovery" value="${escapeHtml(query)}"><span>${rows.length} result${rows.length === 1 ? '' : 's'}</span></div>
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
    <section class="view-heading"><p class="eyebrow">Your boundaries</p><h1>You decide what Champion may understand.</h1><p>These switches affect only the included synthetic fixture and reset when the page reloads.</p></section>
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
    <section class="view-heading"><p class="eyebrow">Visible activity</p><h1>Nothing happens in the dark.</h1><p>The session log records minimized event metadata only. It does not store source payloads, recommendation evidence, passphrases, or credentials.</p></section>
    <div class="audit-toolbar"><span>${entries.length} session event${entries.length === 1 ? '' : 's'}</span><button id="clear-audit" class="ghost-button">Clear session activity</button></div>
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
    <section class="view-heading"><p class="eyebrow">Shield Room</p><h1>Your protection, stated plainly.</h1><p>This is where the technical truth lives. No cloud capability is implied, and no safety boundary is hidden behind the warmer Home experience.</p></section>
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

function animateActiveView() {
  const view = $(`#${state.activeView}-view`);
  if (!view) return;
  view.classList.remove('view-enter');
  requestAnimationFrame(() => view.classList.add('view-enter'));
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
  animateActiveView();
}

function changeView(viewName) {
  state.activeView = viewName;
  state.audit.record('Changed Champion view', { domain: 'system', targetId: state.activeView });
  render();
  $(`#${state.activeView}-view`)?.focus({ preventScroll: true });
}

document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => changeView(button.dataset.view)));

state.audit.record('Opened AEGIS Champion Home', { domain: 'system', targetId: SYNTHETIC_DATASET.datasetId });
render();
window.__AEGIS_CHAMPION_HOME__ = Object.freeze({
  version: '0.9.0',
  experience: 'welcome-first',
  animations: true,
  externalAccounts: 0,
  paidServices: 0
});
window.__AEGIS_CHAMPION_READY__ = true;
