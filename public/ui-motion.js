const running = new WeakMap();

export function enterView(host, { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  running.get(host)?.cancel();
  running.delete(host);
  if (reduced || !host?.isConnected || typeof host.animate !== 'function') return;
  const animation = host.animate(
    [{ opacity: .65, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
    { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
  running.set(host, animation);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const stop = () => { if (media.matches) animation.cancel(); };
  media.addEventListener('change', stop);
  animation.finished.catch(() => {}).finally(() => {
    media.removeEventListener('change', stop);
    if (running.get(host) === animation) running.delete(host);
  });
}
