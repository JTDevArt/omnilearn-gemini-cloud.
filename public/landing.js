(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const demo = document.querySelector('#productDemo');
  const workflow = document.querySelector('[data-landing-reveal]');
  let observer;
  let reveal;
  window.OmniTheme?.refreshControls();

  if (demo) {
    demo.addEventListener('error', () => {
      const fallback = document.querySelector('#demoFallback');
      if (fallback) fallback.hidden = false;
    }, true);
  }
  if (workflow && !reduced.matches && 'IntersectionObserver' in window && typeof workflow.animate === 'function') {
    observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (!reduced.matches) reveal = workflow.animate(
        [{ opacity:.7, transform:'translateY(8px)' }, { opacity:1, transform:'none' }],
        { duration:parseFloat(getComputedStyle(workflow).getPropertyValue('--motion-normal')) || 240, easing:getComputedStyle(workflow).getPropertyValue('--ease-ui').trim() || 'ease-out' }
      );
    }, { threshold:.08 });
    observer.observe(workflow);
  }
  const stopMotion = () => {
    if (!reduced.matches) return;
    observer?.disconnect();
    reveal?.cancel();
  };
  const pauseHiddenVideo = () => { if (document.hidden) demo?.pause(); };
  reduced.addEventListener('change', stopMotion);
  document.addEventListener('visibilitychange', pauseHiddenVideo);
  window.addEventListener('pagehide', () => {
    observer?.disconnect();
    reveal?.cancel();
    demo?.pause();
    reduced.removeEventListener('change', stopMotion);
    document.removeEventListener('visibilitychange', pauseHiddenVideo);
  }, { once:true });
})();
