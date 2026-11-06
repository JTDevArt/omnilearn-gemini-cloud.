const themeKey = 'omnilearn-theme';
try { document.body.classList.toggle('dark', localStorage.getItem(themeKey) === 'dark'); } catch {}
document.querySelector('[data-theme]').addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark');
  try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch {}
});
const demo = document.querySelector('#productDemo');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
demo.addEventListener('error',()=>document.querySelector('#demoFallback').hidden=false,true);
new IntersectionObserver(entries=>{
  if(entries[0].isIntersecting && !reduced.matches) demo.play().catch(()=>{});
  else demo.pause();
}).observe(demo);
reduced.addEventListener('change',()=>{if(reduced.matches)demo.pause();});
