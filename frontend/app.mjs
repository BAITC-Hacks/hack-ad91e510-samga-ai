import { cityService } from './services/api.mjs';
import { tabs } from './components/GlassTabBar.mjs';
import { Icon } from './components/Icon.mjs';
import { Dashboard } from './screens/Dashboard.mjs';
import { DEFAULT_CAMERA } from './components/CityMap.mjs';
import { bindMapInteraction, zoomCamera } from './lib/map-interaction.mjs';
import { groupLabels } from './lib/format.mjs';
import { Decisions } from './screens/Decisions.mjs';
import { Districts } from './screens/Districts.mjs';
import { Result } from './screens/Result.mjs';
import { DistrictSheet } from './components/DistrictSheet.mjs';
import { AIInsightCard } from './components/AIInsightCard.mjs';
import { ControlShell } from './components/ControlShell.mjs';
import { selectionReason, restoreChoices, STORAGE_KEY } from './lib/scenario.mjs';
import { esc } from './lib/format.mjs';
import { animateNumbers, haptic } from './lib/motion.mjs';

const app = document.querySelector('#app');
export const state = { data:null, choices:[], view:'home', group:'all', district:'Нура', result:null, analysis:null, busy:false, analysisBusy:false, analysisError:'', animateResult:false, mapLayer:'all', mapStage:'before', mapIssue:null, showAllIssues:false, mapCamera:[...DEFAULT_CAMERA] };
const screens = { home:Dashboard, decisions:Decisions, districts:Districts, result:Result };
const sheet = document.querySelector('#sheet');
let scenarioRevision = 0;
export function render() {
  const focused = document.activeElement?.dataset.focus;
  const view = screens[state.view] ?? Dashboard;
  app.innerHTML = ControlShell(view(state),state);
  animateNumbers(app);
  bindMapInteraction(state);
  if (state.view === 'result' && state.result) state.animateResult = false;
  if (focused) app.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
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
function saveChoices() {
  scenarioRevision++;
  state.result = null; state.analysis = null; state.analysisError = ''; state.analysisBusy = false;
  state.mapStage = 'before';
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.choices)); } catch { toast('Браузер не сохранил черновик. Сценарий доступен до перезагрузки.'); }
  render();
}
function addChoice(id, district) {
  if (state.busy) return;
  const measure = state.data.measures.find(m => m.id === id);
  const reason = selectionReason(state.choices, measure, state.data.measures, district);
  if (reason) return toast(reason);
  if (measure.type === 'district' && !state.data.districts.some(d => d.name === district)) return;
  state.choices.push(measure.type === 'city' ? {id} : {id,district});
  if (sheet.open) sheet.close();
  haptic(); saveChoices(); toast(`Добавлено: ${measure.name}${district ? ` · ${district}` : ''}`);
}
async function calculate() {
  if (state.busy || state.choices.length !== 5) return;
  const revision = scenarioRevision, choices = structuredClone(state.choices);
  state.busy = true; render();
  try {
    const result = await cityService.evaluate(choices);
    if (revision !== scenarioRevision) return;
    if (!Number.isFinite(result.score) || result.districts?.length !== 5) throw new Error('Сервер не передал корректный результат.');
    state.result = result; state.analysis = null; state.analysisError = ''; state.animateResult = true;
    state.busy = false; state.analysisBusy = true; state.mapStage = 'after';
    haptic(); state.view = 'result'; history.pushState(null,'','#result');
    render(); window.scrollTo({top:0,behavior:'instant'}); document.querySelector('#content').focus({preventScroll:true});
    analyze(choices, revision);
  } catch (error) { toast(error.message); }
  finally { if (state.busy) { state.busy = false; render(); } }
}
function renderAnalysis() {
  if (state.view === 'result' && state.result) {
    const card = document.querySelector('.ai-card');
    if (card) card.outerHTML = AIInsightCard(state);
  }
}
async function analyze(choices = structuredClone(state.choices), revision = scenarioRevision) {
  state.analysisBusy = true; state.analysisError = ''; renderAnalysis();
  try { const analysis = await cityService.analyze(choices); if (revision === scenarioRevision) state.analysis = analysis; }
  catch (error) { if (revision === scenarioRevision) state.analysisError = error.message; }
  finally { if (revision === scenarioRevision) { state.analysisBusy = false; renderAnalysis(); } }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const { action, id, district, group } = button.dataset;
  if (action === 'about') toast('Учебный симулятор. Данные районов условные; Score рассчитывает модель команды.');
  if (action === 'retry-boot') boot();
  if (!state.data) return;
  if (action === 'map-district' && state.data.districts.some(d=>d.name===district)) {
    state.district=district;state.mapIssue=null;state.showAllIssues=false;render();
    if(matchMedia('(max-width: 900px)').matches) document.querySelector('#district-inspector')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }
  if (action === 'map-layer' && (button.dataset.layer==='all' || groupLabels[button.dataset.layer])) {state.mapLayer=button.dataset.layer;state.mapIssue=null;state.showAllIssues=false;render();}
  if (action === 'map-issue' && state.data.indicators.some(i=>i.id===button.dataset.issue)) {state.mapIssue=button.dataset.issue;render();}
  if (action === 'toggle-issues') {state.showAllIssues=!state.showAllIssues;render();}
  if (action === 'map-pick') addChoice(id,state.district);
  if (action === 'map-stage' && ['before','after'].includes(button.dataset.stage) && (button.dataset.stage==='before'||state.result)) {state.mapStage=button.dataset.stage;render();}
  if (action === 'map-zoom') {state.mapCamera=zoomCamera(state.mapCamera,button.dataset.direction==='in'?.8:1.25);render();}
  if (action === 'map-reset') {state.mapCamera=[...DEFAULT_CAMERA];render();}
  if (action === 'filter') { state.group = group; render(); }
  if (action === 'district' && state.data.districts.some(d => d.name === district)) {
    state.district = district; render();
    document.querySelector('#district-detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
  }
  if (action === 'pick' && !state.busy) {
    const measure = state.data.measures.find(m => m.id === id);
    if (!measure) return;
    if (measure.type === 'city') return addChoice(id);
    sheet.innerHTML = DistrictSheet(measure,state); sheet.showModal();
  }
  if (action === 'choose-district') addChoice(id,district);
  if (action === 'close-sheet') sheet.close();
  if (action === 'remove' && !state.busy) { state.choices = state.choices.filter(c => c.id !== id); haptic(); saveChoices(); }
  if (action === 'calculate') calculate();
  if (action === 'retry-analysis' && state.result && !state.analysisBusy) analyze();
});
document.addEventListener('keydown',event=>{
  const target=event.target.closest('svg [role="button"][data-action]');
  if(target && (event.key==='Enter'||event.key===' ')){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
});
sheet.addEventListener('click', event => { if (event.target === sheet) { const rect = sheet.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) sheet.close(); } });
window.addEventListener('hashchange', navigate);
async function boot() {
  try { state.data = await cityService.bootstrap(); try { state.choices = restoreChoices(localStorage.getItem(STORAGE_KEY),state.data); } catch { state.choices = []; } navigate(); }
  catch (error) { app.innerHTML = `<div class="boot error-state">${Icon('city')}<h1>Город скоро будет на связи</h1><p>${esc(error.message)}</p><button class="button primary" data-action="retry-boot">Попробовать снова ${Icon('reset')}</button></div>`; }
}
boot();
