import { generateDailyBrief } from '../aegis-synthetic-coach/coach-engine.mjs';
import { SYNTHETIC_DATASET } from '../aegis-synthetic-coach/fixtures.mjs';
import { $, confidencePercent, escapeHtml, metricCard, prefersReducedMotion, renderRecommendation } from './ui-utils.mjs';
import { heartGraphic } from './heart-graphic.mjs';
import { bindOrganDock, organDock } from './organ-dock.mjs';

export function renderHeart(state, actions) {
  if (state.heartView === 'vital') renderVital(state, actions);
  else renderGateway(state, actions);
}

function renderGateway(state, actions) {
  $('#overview-view').innerHTML = `<div class="biocore-shell heart-gateway" data-chamber="gateway">
    <div class="biocore-landscape" aria-hidden="true"></div>
    <header class="biocore-header"><button id="biocore-menu" class="glass-control" aria-label="Open AEGIS navigation">☰</button><div class="biocore-brand"><span class="biocore-mark">A</span><strong>AEGIS OS</strong><small>BIOCORE</small></div><button id="biocore-shield" class="glass-control" aria-label="Open Shield Room">⌾</button></header>
    <section class="heart-title"><p>01 · VITAL CORE</p><h1>HEART</h1><h2>THE CORE ENGINE</h2><span>Your heart powers every system. Tap to enter your vital core.</span></section>
    <section class="heart-stage" aria-label="Interactive synthetic heart visualization">
      <div class="heart-metrics heart-metrics-left">${metricCard('Heart rate','72','BPM','SIMULATED · NORMAL')}${metricCard('HRV','85','ms','SIMULATED · OPTIMAL')}${metricCard('Blood pressure','117/76','mmHg','SIMULATED · OPTIMAL')}</div>
      <button id="heart-trigger" class="heart-trigger" aria-label="Beat the heart and open Vital Core"><span class="heart-pulse-ring ring-a" aria-hidden="true"></span><span class="heart-pulse-ring ring-b" aria-hidden="true"></span><span class="electric-arc arc-a" aria-hidden="true"></span><span class="electric-arc arc-b" aria-hidden="true"></span><span class="electric-arc arc-c" aria-hidden="true"></span>${heartGraphic('heart-hero-svg')}<span class="heart-core-flare" aria-hidden="true"></span></button>
      <div class="heart-metrics heart-metrics-right">${metricCard('Cardiac output','5.6','L/min','SIMULATED · OPTIMAL')}${metricCard('Recovery','92','%','SIMULATED · OPTIMAL','ring-metric')}${metricCard('Energy flow','High','','SIMULATED · AMPLIFIED')}</div>
    </section>
    <button id="heart-open" class="heart-open-button"><span>♡</span> Tap heart to open</button><p class="heart-tagline">Feel the pulse. Power your life.</p>
    <section class="amplification-strip"><span>✦</span><div><strong>Visual amplification active</strong><small>Synthetic signals are dramatized 100× for clarity. Animation intensity is not medical severity.</small></div></section>
    ${organDock()}<div id="biocore-live" class="visually-hidden" aria-live="polite"></div><div id="organ-toast" class="organ-toast" role="status" aria-live="polite"></div>
  </div>`;
  $('#heart-trigger')?.addEventListener('click', () => activateHeart(state, actions));
  $('#heart-open')?.addEventListener('click', () => activateHeart(state, actions));
  $('#biocore-menu')?.addEventListener('click', () => document.body.classList.toggle('biocore-menu-open'));
  $('#biocore-shield')?.addEventListener('click', () => actions.changeView('system'));
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
