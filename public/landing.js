/* Keep theme, video fallback and keyboard navigation working with CSS entrances. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const demo=document.querySelector('#productDemo');
 const workflow=document.querySelector('[data-landing-reveal]');
 const header=document.querySelector('.landing-header');
 const menu=document.querySelector('.landing-menu');
 let observer;
 window.OmniTheme?.refreshControls();
 const closeMenu=()=>{header?.classList.remove('nav-open');menu?.setAttribute('aria-expanded','false');};
 menu?.addEventListener('click',()=>{const open=header.classList.toggle('nav-open');menu.setAttribute('aria-expanded',String(open));});
 header?.querySelector('nav').addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
 header?.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();menu?.focus();}});
 demo?.addEventListener('error',()=>{const fallback=document.querySelector('#demoFallback');if(fallback)fallback.hidden=false;},true);
 if(workflow && !reduced.matches && 'IntersectionObserver' in window){
  observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){workflow.classList.add('is-visible');observer.disconnect();}},{threshold:.08});
  observer.observe(workflow);
 }
 const stopMotion=()=>{if(reduced.matches){observer?.disconnect();workflow?.classList.remove('is-visible');}};
 const pauseHiddenVideo=()=>{if(document.hidden)demo?.pause();};
 reduced.addEventListener('change',stopMotion);
 document.addEventListener('visibilitychange',pauseHiddenVideo);
 window.addEventListener('pagehide',()=>{observer?.disconnect();demo?.pause();reduced.removeEventListener('change',stopMotion);document.removeEventListener('visibilitychange',pauseHiddenVideo);},{once:true});
})();
