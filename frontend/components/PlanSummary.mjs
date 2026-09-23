import { Icon } from './Icon.mjs';
import { esc } from '../lib/format.mjs';
import { spentBudget } from '../lib/scenario.mjs';
export function PlanSummary(state){
  const spent=spentBudget(state.choices,state.data.measures);
  return `<aside class="plan-summary"><div class="plan-summary-title"><h2>Ваш план</h2><span>${state.choices.length} / 5</span></div><ol>${Array.from({length:5},(_,index)=>{
    const choice=state.choices[index],m=choice&&state.data.measures.find(m=>m.id===choice.id);
    return `<li class="${m?'filled':''}"><span class="plan-number">${index+1}</span>${m?`<div><strong>${esc(m.name)}</strong><small>${esc(choice.district??'Весь город')} · ${m.cost} ед.</small></div><button data-action="remove" data-id="${m.id}" ${state.busy?'disabled':''} aria-label="Убрать: ${esc(m.name)}">${Icon('close')}</button>`:'<span>Решение ещё не принято</span>'}</li>`;
  }).join('')}</ol><div class="plan-total"><span>Использовано</span><strong>${spent}<small> / 100 ед.</small></strong></div><div class="plan-remaining"><span>Осталось</span><strong>${100-spent} ед.</strong></div>${state.choices.length===5?`<button class="button primary" data-action="calculate" ${state.busy?'disabled':''}>${state.busy?'Рассчитываем…':'Увидеть последствия'}${Icon('arrow')}</button>`:'<p>Примите пять решений. Не обязательно тратить весь бюджет.</p>'}<a href="#decisions">Весь каталог мероприятий ${Icon('arrow')}</a></aside>`;
}
