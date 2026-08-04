import { SYNTHETIC_DATASET } from '../aegis-synthetic-coach/fixtures.mjs';
import { createAuditLog } from '../aegis-synthetic-coach/coach-engine.mjs';
import { renderHeart } from './biocore-heart.mjs';
import { renderAudit, renderPermissions, renderSystem, renderTimeline } from './support-views.mjs';
import { $ } from './ui-utils.mjs';

const state = { permissions:{ ...SYNTHETIC_DATASET.permissions }, activeView:'overview', heartView:'gateway', heartAnimating:false, audit:createAuditLog(), expandedEvidence:new Set() };

function animateActiveView() {
  const view = $(`#${state.activeView}-view`); if (!view) return;
  view.classList.remove('view-enter'); requestAnimationFrame(() => view.classList.add('view-enter'));
}

function rerenderHeart() { renderHeart(state, { changeView, rerenderHeart }); animateActiveView(); }

function render() {
  document.querySelectorAll('.view').forEach((view) => { view.hidden = true; });
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === state.activeView));
  document.body.classList.toggle('biocore-mode', state.activeView === 'overview');
  if (state.activeView !== 'overview') document.body.classList.remove('biocore-menu-open');
  const view = $(`#${state.activeView}-view`); if (!view) return; view.hidden = false;
  if (state.activeView === 'overview') rerenderHeart();
  if (state.activeView === 'timeline') renderTimeline(state);
  if (state.activeView === 'permissions') renderPermissions(state);
  if (state.activeView === 'audit') renderAudit(state);
  if (state.activeView === 'system') renderSystem();
  animateActiveView();
}

function changeView(viewName) {
  state.activeView = viewName;
  state.audit.record('Changed Champion view', { domain:'system', targetId:viewName });
  render(); $(`#${viewName}-view`)?.focus({ preventScroll:true });
}

document.querySelectorAll('.nav-button').forEach((button) => button.addEventListener('click', () => changeView(button.dataset.view)));
state.audit.record('Opened AEGIS BioCore Heart', { domain:'system', targetId:SYNTHETIC_DATASET.datasetId });
render();
window.__AEGIS_BIOCORE__ = Object.freeze({
  version: '1.1.0', experience: 'organ-gateway', organ: 'heart',
  visualAmplification: 100, simulatedData: true, animations: true,
  externalAccounts: 0, paidServices: 0
});
window.__AEGIS_CHAMPION_READY__ = true;
