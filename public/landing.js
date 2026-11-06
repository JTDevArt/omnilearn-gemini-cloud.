const demo = document.querySelector('#productDemo');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
window.OmniTheme?.refreshControls();

if (demo) {
  const showFallback = () => {
    const fallback = document.querySelector('#demoFallback');
    if (fallback) fallback.hidden = false;
  };
  demo.addEventListener('error', showFallback, true);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !reduced.matches && !document.hidden) demo.play().catch(() => {});
      else demo.pause();
    }, { threshold: 0.2 }).observe(demo);
  }
  reduced.addEventListener('change', () => { if (reduced.matches) demo.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) demo.pause(); });
}
