const state = {
  status: 'unsupported',
  scope: null,
  workerState: null,
  error: null
};

window.__AEGIS_SW_STATE__ = state;

function activeWorker(registration) {
  return registration.active || registration.waiting || registration.installing || null;
}

function updateWorker(registration) {
  const worker = activeWorker(registration);
  state.workerState = worker?.state || null;
  state.scope = registration.scope;
  if (worker) worker.addEventListener('statechange', () => { state.workerState = worker.state; });
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  state.status = 'registering';
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    updateWorker(registration);
    state.status = 'registered';
  } catch (error) {
    state.status = 'failed';
    state.error = error?.message || String(error);
  }
}
