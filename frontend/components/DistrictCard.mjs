import { Icon } from './Icon.mjs';
import { esc, fmt, signed } from '../lib/format.mjs';
export function DistrictCard(district, index, state) {
  const after = state.result?.districts.find(d => d.name === district.name);
  const values = state.data.indicators.map(i => ({ ...i, value:district.values[i.id] })).sort((a,b) => b.value-a.value);
  return `<button class="district-card ${state.district === district.name ? 'active' : ''}" data-action="district" data-district="${esc(district.name)}" data-focus="district-${index}" aria-pressed="${state.district === district.name}" aria-controls="district-detail"><div class="district-card-top"><span class="district-number">0${index+1}</span>${Icon('pin')}</div><h2>${esc(district.name)}</h2><div class="district-card-score">${fmt(after?.score ?? district.score,1)}<small>${after ? signed(after.score-district.score) : 'из 100'}</small></div><p class="district-pop">${Icon('people')}${fmt(district.pop*100,0)}% населения</p><div class="district-traits"><p><span class="trait-dot good"></span>${esc(values[0].name)}</p><p><span class="trait-dot concern"></span>${esc(values.at(-1).name)}</p></div><span class="district-open">Показатели района ${Icon('arrow')}</span></button>`;
}
