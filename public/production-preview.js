const frame = document.querySelector('#routeFrame');
const tabs = [...document.querySelectorAll('[data-route]')];
const title = document.querySelector('#frameTitle');
const url = document.querySelector('#frameUrl');
const status = document.querySelector('#routeStatus');
const openRoute = document.querySelector('#openRoute');
const reload = document.querySelector('#reloadFrame');

let activeIndex = 0;

function selectRoute(index, {updateHash = true} = {}) {
  activeIndex = (index + tabs.length) % tabs.length;
  const tab = tabs[activeIndex];
  const route = tab.dataset.route;
  const label = tab.dataset.label || tab.textContent.trim();
  tabs.forEach((item, itemIndex) => {
    item.setAttribute('aria-selected', String(itemIndex === activeIndex));
    item.tabIndex = itemIndex === activeIndex ? 0 : -1;
  });
  title.textContent = label;
  url.textContent = route;
  status.textContent = `Preview · ${label}`;
  openRoute.href = route;
  frame.title = `Preview ${label} · OmniLearn AI`;
  frame.src = route;
  if (updateHash) history.replaceState(null, '', `#${activeIndex}`);
}

tabs.forEach((tab, index) => tab.addEventListener('click', () => selectRoute(index)));
reload.addEventListener('click', () => { frame.src = frame.src; });
window.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  selectRoute(activeIndex + direction);
  tabs[activeIndex].focus();
});
window.addEventListener('popstate', () => {
  const index = Number(location.hash.slice(1));
  if (Number.isInteger(index) && index >= 0 && index < tabs.length) selectRoute(index, {updateHash: false});
});

const initialIndex = Number(location.hash.slice(1));
selectRoute(Number.isInteger(initialIndex) && initialIndex >= 0 && initialIndex < tabs.length ? initialIndex : 0, {updateHash: false});
