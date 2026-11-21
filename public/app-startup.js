(() => {
  const splash = document.querySelector('#appStartup');
  const status = document.querySelector('#appStartupStatus');
  const retry = document.querySelector('#appStartupRetry');
  const timer = window.setTimeout(() => fail('Ruang belajar belum terbuka. Kamu dapat memuat ulang.'), 12000);

  function fail(message = 'Ruang belajar gagal dibuka. Muat ulang untuk mencoba lagi.') {
    if (splash.hidden) return;
    window.clearTimeout(timer);
    splash.dataset.state = 'failed';
    status.textContent = message;
    retry.hidden = false;
  }

  window.OmniAppStartup = Object.freeze({
    complete() {
      window.clearTimeout(timer);
      const restoreFocus = document.activeElement === retry;
      splash.hidden = true;
      if (restoreFocus) document.querySelector('#productMenu')?.focus();
    },
    fail,
  });
})();
