import { outcomeFacts } from '../lib/journey.mjs';
import { esc,fmt,signed } from '../lib/format.mjs';
import { Icon } from './Icon.mjs';
export function OutcomeSummary(state){
  const facts=outcomeFacts(state);if(!facts)return '';
  return `<section class="outcome-summary" aria-label="Что ваши решения дали городу"><div><span>${Icon('people')}</span><h2>Кому стало лучше</h2><strong>${facts.improved} из 5 районов</strong><p>Получили рост общего показателя после ваших решений.</p></div><div><span>${Icon('chart')}</span><h2>Самое заметное изменение</h2><strong>${esc(facts.best.name)} <small>${signed(facts.best.delta)}</small></strong><p>Изменение общего показателя этого района.</p></div><div><span>${Icon('warning')}</span><h2>Что требует внимания</h2><strong>${esc(facts.weakest.district)}</strong><p>${esc(facts.weakest.name)}: <b>${fmt(facts.weakest.value,1)} из 100</b>. Самый низкий показатель после расчёта.</p></div></section>`;
}
