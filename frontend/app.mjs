import { cityService } from './services/api.mjs';
import { GlassTabBar, tabs } from './components/GlassTabBar.mjs';
import { Icon } from './components/Icon.mjs';
import { Home } from './screens/Home.mjs';
import { esc } from './lib/format.mjs';
import { animateNumbers } from './lib/motion.mjs';

const app = document.querySelector('#app');
export const state = { data:null, choices:[], view:'home', group:'all', result:null, analysis:null, busy:false, analysisBusy:false, analysisError:'' };
const screens = { home:Home };
export function render() {
  const view = screens[state.view] ?? Home;
  app.innerHTML = `<div class="app-shell"><header class="topbar"><a class="brand" href="#home" aria-label="SAMGA AI — Сегодня"><span class="brand-mark">${Icon('city')}</span><span>SAMGA<span class="brand-ai"> AI</span></span></a><div class="topbar-right"><span class="session-label"><i class="status-dot"></i>${state.data.demo ? 'Демо-сценарий' : 'Городской симулятор'}</span><button class="icon-button" data-action="about" aria-label="О симуляторе">${Icon('info')}</button></div></header><main id="content" tabindex="-1">${view(state)}</main><footer class="app-footer"><span>SAMGA AI</span><span>Ваш взгляд на будущее Астаны</span></footer></div>${GlassTabBar(state.view)}`;
  animateNumbers(app);
}
function navigate() {
  const next = location.hash.slice(1);
  state.view = tabs.some(([key]) => key === next) ? next : 'home';
  if (state.data) { render(); window.scrollTo({top:0, behavior:'instant'}); document.querySelector('#content').focus({preventScroll:true}); }
}
let toastTimer;
export function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
document.addEventListener('click', event => {
  if (event.target.closest('[data-action="about"]')) toast('Учебный симулятор. Данные районов условные; Score рассчитывает модель команды.');
  if (event.target.closest('[data-action="retry-boot"]')) boot();
});
window.addEventListener('hashchange', navigate);
async function boot() {
  try { state.data = await cityService.bootstrap(); navigate(); }
  catch (error) { app.innerHTML = `<div class="boot error-state">${Icon('city')}<h1>Город скоро будет на связи</h1><p>${esc(error.message)}</p><button class="button primary" data-action="retry-boot">Попробовать снова ${Icon('reset')}</button></div>`; }
}
boot();
