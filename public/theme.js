/* Run before styles so the first paint uses the saved appearance. */
(() => {
  'use strict';
  const storageKey = 'omnilearn-theme';
  const choices = ['system', 'light', 'dark'];
  const labels = { system: 'Ikuti perangkat', light: 'Terang', dark: 'Gelap' };
  const icons = { system: '◐', light: '☀', dark: '☾' };
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const read = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  let preference = choices.includes(read()) ? read() : 'system';
  let resolved = 'light';

  function updateControls() {
    document.querySelectorAll('[data-theme-label]').forEach(node => {
      node.textContent = labels[preference];
    });
    document.querySelectorAll('[data-theme-icon]').forEach(node => {
      node.textContent = icons[preference];
    });
    document.querySelectorAll('[data-theme-select]').forEach(node => {
      node.value = preference;
    });
    document.querySelectorAll('[data-cycle-theme], [data-theme], #productTheme, [data-theme-setting]').forEach(node => {
      const next = choices[(choices.indexOf(preference) + 1) % choices.length];
      node.setAttribute('aria-label', `Tema: ${labels[preference]}. Ganti ke ${labels[next].toLowerCase()}`);
      node.setAttribute('title', `Tema: ${labels[preference]}`);
    });
  }

  function apply() {
    resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
    if (document.body) document.body.classList.toggle('dark', resolved === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#10131a' : '#fffaf5';
    updateControls();
    window.dispatchEvent(new CustomEvent('omnilearn:themechange', {
      detail: { preference, resolved }
    }));
    return resolved;
  }

  function setPreference(value) {
    preference = choices.includes(value) ? value : 'system';
    try { localStorage.setItem(storageKey, preference); } catch { /* Storage can be unavailable in private embeds. */ }
    apply();
    return preference;
  }

  window.OmniTheme = Object.freeze({
    getPreference: () => preference,
    getResolved: () => resolved,
    setPreference,
    cycle: () => setPreference(choices[(choices.indexOf(preference) + 1) % choices.length]),
    refreshControls: updateControls
  });

  apply();
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-cycle-theme], [data-set-theme]');
    if (!button) return;
    if (button.hasAttribute('data-set-theme')) setPreference(button.dataset.setTheme);
    else window.OmniTheme.cycle();
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-theme-select]')) setPreference(event.target.value);
  });
  const onSystemChange = () => { if (preference === 'system') apply(); };
  if (media.addEventListener) media.addEventListener('change', onSystemChange);
  else media.addListener(onSystemChange);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    const stored = read();
    preference = choices.includes(stored) ? stored : 'system';
    apply();
  });
})();
