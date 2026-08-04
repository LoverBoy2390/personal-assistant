import { generateDailyBrief } from '../aegis-synthetic-coach/coach-engine.mjs';
import { SYNTHETIC_DATASET } from '../aegis-synthetic-coach/fixtures.mjs';
import { $, confidencePercent, escapeHtml, metricCard, prefersReducedMotion, renderRecommendation } from './ui-utils.mjs';
import { heartGraphic } from './heart-graphic.mjs';
import { heartArtUrl } from './heart-art.mjs';
import { bindOrganDock, organDock } from './organ-dock.mjs';

export function renderHeart(state, actions) {
  if (state.heartView === 'vital') renderVital(state, actions);
  else renderGateway(state, actions);
}

function referenceOrganDock() {
  const organs = [
    ['brain', 'Brain', 'Neural Intelligence'],
    ['lungs', 'Lungs', 'Respiration'],
    ['heart', 'Heart', 'Vital Core'],
    ['stomach', 'Stomach', 'Metabolism'],
    ['intestines', 'Intestines', 'Filtration']
  ];
  return `<nav class="reference-organ-dock" aria-label="BioCore organ systems">${organs.map(([id, label, detail]) => `<button class="reference-organ-hotspot organ-button ${id === 'heart' ? 'active' : ''}" data-organ="${id}" aria-label="${label}: ${detail}" ${id === 'heart' ? '' : 'aria-describedby="organ-reserved"'}><small>${label}</small></button>`).join('')}</nav><span id="organ-reserved" class="visually-hidden">Reserved for a later BioCore build.</span>`;
}

function referenceMetricHotspots() {
  const metrics = [
    ['heart-rate', 'Heart rate', '72 BPM · simulated normal'],
    ['hrv', 'Heart-rate variability', '85 milliseconds · simulated optimal'],
    ['blood-pressure', 'Blood pressure', '117 over 76 millimeters of mercury · simulated optimal'],
    ['cardiac-output', 'Cardiac output', '5.6 liters per minute · simulated optimal'],
    ['recovery', 'Recovery', '92 percent · simulated optimal'],
    ['energy-flow', 'Energy flow', 'High flow · simulated and amplified']
  ];
  return `<div class="reference-metric-hotspots">${metrics.map(([id, label, detail]) => `<button class="reference-hotspot reference-metric-hotspot metric-${id}" data-metric-label="${label}" data-metric-detail="${detail}" aria-label="${label}: ${detail}"></button>`).join('')}</div>`;
}

function showReferenceToast(message) {
  const toast = $('#organ-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showReferenceToast.timer);
  showReferenceToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function renderGateway(state, actions) {
  $('#overview-view').innerHTML = `<div class="biocore-shell heart-gateway reference-gateway" data-chamber="gateway">
    <img class="reference-ambient" src="${heartArtUrl}" alt="" aria-hidden="true">
    <div class="reference-stage" id="reference-stage">
      <img class="reference-art" src="${heartArtUrl}" alt="AEGIS BioCore Heart gateway in a serene mountain landscape">
      <button id="heart-trigger" class="reference-heart-hitbox heart-trigger" aria-label="Beat the heart and open Vital Core">
        <img class="reference-heart-overlay heart-svg" src="${heartArtUrl}" alt="">
        <span class="reference-heart-flare" aria-hidden="true"></span>
        <span class="reference-pulse-ring ring-a" aria-hidden="true"></span>
        <span class="reference-pulse-ring ring-b" aria-hidden="true"></span>
        <span class="reference-electric-arc arc-a" aria-hidden="true"></span>
        <span class="reference-electric-arc arc-b" aria-hidden="true"></span>
        <span class="reference-electric-arc arc-c" aria-hidden="true"></span>
      </button>
      <button id="biocore-menu" class="reference-hotspot reference-menu-hotspot" aria-label="Open AEGIS navigation"></button>
      <button id="biocore-shield" class="reference-hotspot reference-profile-hotspot" aria-label="Open profile and Shield Room"></button>
      <button id="heart-open" class="reference-hotspot reference-open-hotspot" aria-label="Tap heart to open Vital Core"><span class="visually-hidden">Tap heart to open</span></button>
      <button id="reference-system-status" class="reference-hotspot reference-system-hotspot" aria-label="Open system status in Shield Room"></button>
      <button id="reference-best-action" class="reference-hotspot reference-action-hotspot" aria-label="Open Best Next Action in Vital Core"></button>
      <button id="reference-amplification" class="reference-hotspot reference-amplification-hotspot" aria-label="Explain visual amplification"></button>
      ${referenceMetricHotspots()}
      ${referenceOrganDock()}
      <div class="reference-accessibility-copy visually-hidden">
        <h1>HEART</h1><h2>THE CORE ENGINE</h2>
        <p>Your heart powers every system. Tap heart to open your vital core.</p>
        <p>Visual amplification active. Synthetic signals are dramatized 100 times for clarity. Animation intensity is not medical severity.</p>
        <p>SIMULATED. No wearable, health record, external account, cloud service, or external runtime network is connected.</p>
      </div>
    </div>
    <div id="biocore-live" class="visually-hidden" aria-live="polite"></div>
    <div id="organ-toast" class="organ-toast reference-toast" role="status" aria-live="polite"></div>
  </div>`;

  $('#heart-trigger')?.addEventListener('click', () => activateHeart(state, actions));
  $('#heart-open')?.addEventListener('click', () => activateHeart(state, actions));
  $('#reference-best-action')?.addEventListener('click', () => activateHeart(state, actions));
  $('#biocore-menu')?.addEventListener('click', () => document.body.classList.toggle('biocore-menu-open'));
  $('#biocore-shield')?.addEventListener('click', () => actions.changeView('system'));
  $('#reference-system-status')?.addEventListener('click', () => actions.changeView('system'));
  $('#reference-amplification')?.addEventListener('click', () => showReferenceToast('Visual motion is amplified 100× for clarity. It does not represent medical severity.'));
  document.querySelectorAll('.reference-metric-hotspot').forEach((button) => button.addEventListener('click', () => {
    showReferenceToast(`${button.dataset.metricLabel}: ${button.dataset.metricDetail}`);
    button.classList.remove('metric-pulse');
    requestAnimationFrame(() => button.classList.add('metric-pulse'));
  }));
  bindOrganDock(state, actions.rerenderHeart);
}

function renderVital(state, actions) {
  const brief = generateDailyBrief(SYNTHETIC_DATASET, state.permissions);
  const best = brief.bestNextAction;
  const recommendations = brief.recommendations.slice(0, 2).map((card) => renderRecommendation(card, state.expandedEvidence.has(card.id))).join('');
  $('#overview-view').innerHTML = `<div class="biocore-shell vital-chamber" data-chamber="vital">
    <div class="biocore-landscape" aria-hidden="true"></div>
    <header class="biocore-header"><button id="heart-back" class="glass-control" aria-label="Return to Heart gateway">←</button><div class="biocore-brand"><span class="biocore-mark">A</span><strong>VITAL CORE</strong><small>HEART ENGINE</small></div><button id="biocore-shield" class="glass-control" aria-label="Open Shield Room">⌾</button></header>
    <section class="vital-intro"><div><p>HEART CHAMBER · SYNTHETIC REVIEW</p><h1>Your system pulse.</h1><span>One place for readiness, energy, recovery, and the action that matters next.</span></div><div class="vital-status"><small>System status</small><strong>OPTIMAL</strong><span>Simulated</span></div></section>
    <section class="vital-grid"><article class="vital-heart-card"><div class="mini-heart-wrap">${heartGraphic('heart-mini-svg')}<span></span></div><div class="vital-score"><small>Pulse synchronization</small><strong>100%</strong><span>Visual amplification 100×</span></div></article>${metricCard('Heart rate','72','BPM','SIMULATED · NORMAL')}${metricCard('Recovery','92','%','SIMULATED · OPTIMAL','ring-metric')}${metricCard('HRV','85','ms','SIMULATED · OPTIMAL')}${metricCard('Cardiac output','5.6','L/min','SIMULATED · OPTIMAL')}</section>
    <section class="vital-action"><div><p>BEST NEXT ACTION</p><h2>${best ? escapeHtml(best.title) : 'Hydrate and breathe'}</h2><span>${best ? escapeHtml(best.summary) : 'Take a calm reset before the next demand.'}</span></div><strong>${best ? confidencePercent(best.confidence) : '92%'}</strong></section>
    <section class="vital-insights"><div class="section-heading"><div><p class="eyebrow">Champion insight</p><h2>What the core notices</h2></div></div><div class="signal-list">${recommendations || '<p class="empty-state">No enabled synthetic source currently produces a recommendation.</p>'}</div></section>
    <section class="amplification-strip"><span>✦</span><div><strong>Demonstration data only</strong><small>No wearable, health record, account, or external network is connected.</small></div></section>
    ${organDock()}<div id="organ-toast" class="organ-toast" role="status" aria-live="polite"></div>
  </div>`;
  $('#heart-back')?.addEventListener('click', () => { state.heartView = 'gateway'; state.audit.record('Returned to Heart gateway', { domain:'wellness', targetId:'heart-gateway' }); actions.rerenderHeart(); });
  $('#biocore-shield')?.addEventListener('click', () => actions.changeView('system'));
  document.querySelectorAll('.evidence-button').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.id; state.expandedEvidence.has(id) ? state.expandedEvidence.delete(id) : state.expandedEvidence.add(id); state.audit.record('Reviewed Vital Core evidence', { domain:'wellness', targetId:id }); renderVital(state, actions); }));
  bindOrganDock(state, actions.rerenderHeart);
}

function activateHeart(state, actions) {
  if (state.heartAnimating) return;
  state.heartAnimating = true;
  document.querySelector('.heart-gateway')?.classList.add('surge-active');
  $('#heart-trigger')?.classList.add('is-beating');
  const live = $('#biocore-live'); if (live) live.textContent = 'Heart pulse activated. Opening Vital Core.';
  try { navigator.vibrate?.([32, 42, 55]); } catch { /* optional */ }
  state.audit.record('Activated Heart Core', { domain:'wellness', targetId:'vital-core' });
  window.setTimeout(() => { state.heartView = 'vital'; state.heartAnimating = false; actions.rerenderHeart(); }, prefersReducedMotion() ? 80 : 920);
}
