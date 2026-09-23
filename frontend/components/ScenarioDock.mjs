import { Icon } from './Icon.mjs';
import { esc } from '../lib/format.mjs';
import { spentBudget } from '../lib/scenario.mjs';
export function ScenarioDock(state) {
  const spent=spentBudget(state.choices,state.data.measures);
  return `<section class="scenario-dock instrument-panel"><div class="scenario-dock-heading"><div><span class="instrument-eyebrow">ПЛАН ИЗМЕНЕНИЙ</span><h2>От проблемы к решению</h2></div><span class="scenario-count">${state.choices.length}<small> / 5</small></span></div><div class="scenario-slots">${Array.from({length:5},(_,index)=>{
    const choice=state.choices[index],measure=choice&&state.data.measures.find(m=>m.id===choice.id);
    return measure ? `<div class="scenario-slot filled"><span class="slot-number">0${index+1}</span><div><strong>${esc(measure.name)}</strong><span>${esc(choice.district || 'Весь город')} · ${measure.cost} ед.</span></div><button data-action="remove" data-id="${measure.id}" ${state.busy?'disabled':''} aria-label="Убрать: ${esc(measure.name)}">${Icon('close')}</button></div>` : `<div class="scenario-slot"><span class="slot-number">0${index+1}</span><span>Выберите меру<br><small>на карте или в каталоге</small></span></div>`;
  }).join('')}</div><div class="scenario-dock-footer"><p><span class="status-dot"></span>${state.choices.length===5 ? `Сценарий готов · ${spent} из 100 ед.` : `Ещё ${5-state.choices.length} решений, чтобы увидеть последствия`}</p><button class="button primary" data-action="calculate" ${state.choices.length!==5 || state.busy?'disabled':''}>${state.busy?'<span class="spinner"></span> Рассчитываем…':`Рассчитать последствия ${Icon('arrow')}`}</button></div></section>`;
}
