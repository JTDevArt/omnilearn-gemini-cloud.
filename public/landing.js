(() => {
  const demo = document.querySelector('#productDemo');
  const fallback = document.querySelector('#demoFallback');
  const header = document.querySelector('.landing-header');
  const menu = document.querySelector('.landing-menu');
  const nav = document.querySelector('#landingLinks');

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Tutup navigasi' : 'Buka navigasi');
  }

  menu.hidden = false;
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });

  demo.addEventListener('error', () => { fallback.hidden = false; }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) demo.pause();
  });
  window.addEventListener('pagehide', () => demo.pause());
})();
