'use strict';

const NAV_ITEMS = ['Dashboard', 'Command', 'Planning', 'Guardian', 'Health', 'Wealth', 'Projects'];
const NAV_ICONS = ['▦', '⌘', '☑', '⬡', '♡', '◫', '◎'];
const DEFAULT_TASKS = [
  { id: 1, label: 'Review today’s priorities', done: true, tag: 'Planning' },
  { id: 2, label: 'Complete 20-minute recovery workout', done: false, tag: 'Health' },
  { id: 3, label: 'Check debt payoff progress', done: false, tag: 'Wealth' }
];
const FOCUS_SECONDS = 20 * 60;

const $ = selector => document.querySelector(selector);
const notice = message => { $('#notice').textContent = message; };
const cloneDefaultTasks = () => DEFAULT_TASKS.map(task => ({ ...task }));

const storage = {
  available: true,
  get(key) {
    try {
      const value = localStorage.getItem(key);
      this.available = true;
      return value;
    } catch {
      this.available = false;
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  },
  test() {
    const key = 'aegis.check';
    return this.set(key, 'ok') && this.remove(key);
  }
};

function loadTasks() {
  try {
    const stored = JSON.parse(storage.get('aegis.tasks'));
    return Array.isArray(stored) ? stored : cloneDefaultTasks();
  } catch {
    return cloneDefaultTasks();
  }
}

let tasks = loadTasks();
const nav = $('#nav');

NAV_ITEMS.forEach((label, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = index === 0 ? 'active' : '';
  button.innerHTML = `<span>${NAV_ICONS[index]}</span>${label}`;
  button.addEventListener('click', () => {
    [...nav.children].forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    notice(`${label} module selected · module content is not implemented yet`);
    closeMenu();
  });
  nav.appendChild(button);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function saveTasks() {
  const persisted = storage.set('aegis.tasks', JSON.stringify(tasks));
  renderTasks();
  return persisted;
}

function renderTasks() {
  const host = $('#taskList');
  host.innerHTML = '';

  tasks.forEach(task => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task-row ${task.done ? 'done' : ''}`;
    button.innerHTML = `<i>${task.done ? '✓' : ''}</i><span><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.tag)}</small></span><b>›</b>`;
    button.addEventListener('click', () => {
      task.done = !task.done;
      const persisted = saveTasks();
      notice(persisted ? 'Task status updated in this browser' : 'Task updated for this session · browser storage is unavailable');
    });
    host.appendChild(button);
  });

  const completed = tasks.filter(task => task.done).length;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  $('#progress').textContent = `${percentage}%`;
  $('#progressText').textContent = `${completed} of ${tasks.length} priorities`;
}

$('#addTask').addEventListener('click', () => {
  const label = prompt('Name this priority:', 'New priority');
  if (!label?.trim()) return;
  tasks.push({ id: Date.now(), label: label.trim(), done: false, tag: 'General' });
  const persisted = saveTasks();
  notice(persisted ? 'Priority added in this browser' : 'Priority added for this session · browser storage is unavailable');
});

function runLocalDiagnostics() {
  const checks = [
    { name: 'Required interface elements', ok: ['#nav', '#taskList', '#progress', '#notice'].every(selector => document.querySelector(selector)) },
    { name: 'Local storage access', ok: storage.test() },
    { name: 'Page stylesheet', ok: [...document.styleSheets].length > 0 && document.readyState !== 'loading' },
    { name: 'PWA manifest', ok: Boolean(document.querySelector('link[rel="manifest"]')) }
  ];

  const passed = checks.filter(check => check.ok).length;
  const allPassed = passed === checks.length;
  $('#diagnosticState').textContent = `${passed}/${checks.length} passed`;
  $('#guardianSummary').textContent = allPassed
    ? 'Local interface, storage, stylesheet, and manifest checks passed. No device or security scan was performed.'
    : 'A local dashboard check failed. No device or security scan was performed.';
  notice(`Local check: ${passed}/${checks.length} passed · device scanning is not connected`);
  return { passed, total: checks.length, ok: allPassed };
}

$('#runCheck').addEventListener('click', runLocalDiagnostics);
$('#connectWealth').addEventListener('click', () => notice('Financial connection is disabled until a secure backend and explicit authorization exist'));

let focusTimerId = null;
let focusEndAt = Number(storage.get('aegis.focusEndAt')) || 0;
let focusRemaining = Number(storage.get('aegis.focusRemaining'));
if (!Number.isFinite(focusRemaining) || focusRemaining <= 0 || focusRemaining > FOCUS_SECONDS) {
  focusRemaining = FOCUS_SECONDS;
}

function saveFocusState() {
  storage.set('aegis.focusRemaining', String(focusRemaining));
  if (focusEndAt) storage.set('aegis.focusEndAt', String(focusEndAt));
  else storage.remove('aegis.focusEndAt');
}

function renderFocus() {
  const minutes = String(Math.floor(focusRemaining / 60)).padStart(2, '0');
  const seconds = String(focusRemaining % 60).padStart(2, '0');
  $('#startFocus').textContent = focusEndAt ? `Pause ${minutes}:${seconds}` : `Start ${minutes}:${seconds} ›`;
}

function completeFocus() {
  clearInterval(focusTimerId);
  focusTimerId = null;
  focusEndAt = 0;
  focusRemaining = FOCUS_SECONDS;
  saveFocusState();
  renderFocus();
  notice('Recovery block complete');
}

function syncFocusClock() {
  if (!focusEndAt) return;
  focusRemaining = Math.max(0, Math.ceil((focusEndAt - Date.now()) / 1000));
  if (focusRemaining <= 0) completeFocus();
  else {
    saveFocusState();
    renderFocus();
  }
}

function startFocusTicker() {
  clearInterval(focusTimerId);
  focusTimerId = setInterval(syncFocusClock, 1000);
  syncFocusClock();
}

if (focusEndAt > Date.now()) startFocusTicker();
else if (focusEndAt) completeFocus();

$('#startFocus').addEventListener('click', () => {
  if (focusEndAt) {
    syncFocusClock();
    focusEndAt = 0;
    clearInterval(focusTimerId);
    focusTimerId = null;
    saveFocusState();
    renderFocus();
    notice('Recovery timer paused in this browser');
    return;
  }

  focusEndAt = Date.now() + (focusRemaining * 1000);
  saveFocusState();
  startFocusTicker();
  notice('20-minute recovery timer started in this browser');
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncFocusClock();
});

const currentHour = new Date().getHours();
$('#greeting').textContent = `Good ${currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening'}, Sir.`;
$('#today').textContent = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const sidebar = $('#sidebar');
function closeMenu() {
  sidebar.classList.remove('open');
  $('#scrim').classList.remove('show');
}
$('#menuBtn').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  $('#scrim').classList.toggle('show');
});
$('#scrim').addEventListener('click', closeMenu);

$('#search').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.glass-card').forEach(card => {
    card.style.display = !query || card.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
});

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function updateModePill() {
  const pill = $('#modePill');
  if (isStandalone()) pill.lastChild.textContent = 'Installed app';
  else if (!navigator.onLine) pill.lastChild.textContent = 'Offline mode';
  else pill.lastChild.textContent = 'Web mode';
}

window.addEventListener('online', updateModePill);
window.addEventListener('offline', updateModePill);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => notice('AEGIS web app ready · external systems remain disconnected'))
      .catch(() => notice('Dashboard loaded, but offline installation did not complete'));
  });
}

renderTasks();
renderFocus();
updateModePill();
