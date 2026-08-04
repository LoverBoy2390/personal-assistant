import { $ } from './ui-utils.mjs';

export function organDock() {
  const organs = [
    ['brain', 'Brain', 'Neural Intelligence', '◌'],
    ['lungs', 'Lungs', 'Respiration', '♧'],
    ['heart', 'Heart', 'Vital Core', '♡'],
    ['stomach', 'Stomach', 'Metabolism', '◔'],
    ['intestines', 'Intestines', 'Filtration', '▦']
  ];
  return `<nav class="organ-dock" aria-label="BioCore organ systems">${organs.map(([id,label,detail,symbol]) => `<button class="organ-button ${id === 'heart' ? 'active' : ''}" data-organ="${id}" aria-label="${label}: ${detail}" ${id === 'heart' ? '' : 'aria-describedby="organ-reserved"'}><span aria-hidden="true">${symbol}</span><small>${label}</small></button>`).join('')}</nav><span id="organ-reserved" class="visually-hidden">Reserved for a later BioCore build.</span>`;
}

export function bindOrganDock(state, rerender) {
  document.querySelectorAll('.organ-button').forEach((button) => button.addEventListener('click', () => {
    const organ = button.dataset.organ;
    if (organ === 'heart') {
      if (state.heartView === 'vital') { state.heartView = 'gateway'; rerender(); }
      return;
    }
    const toast = $('#organ-toast');
    const label = button.querySelector('small')?.textContent || 'This organ';
    if (toast) {
      toast.textContent = `${label} Core is reserved for the next BioCore build.`;
      toast.classList.add('show');
      window.setTimeout(() => toast.classList.remove('show'), 2400);
    }
    state.audit.record('Previewed reserved BioCore organ', { domain: 'system', targetId: organ });
  }));
}
