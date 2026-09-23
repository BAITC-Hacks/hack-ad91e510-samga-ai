import {districts,indicators,measures,groups,scenarios} from './data.mjs';
import {simulate,evaluate} from './model.mjs';

const $=s=>document.querySelector(s);
const fmt=(n,d=2)=>n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const baseline=simulate([]);
const grade=v=>v<40?'heat-critical':v<60?'heat-caution':'heat-good';
const effectText=e=>Object.entries(e).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ');
const titles={overview:'Суть задачи',requirements:'Что обязательно',data:'Районы и меры',formula:'Как считается балл',scenarios:'Разбор сценариев',plan:'План команды',questions:'Что уточнить'};

function showPage({focus=false}={}){
 const requested=location.hash.slice(1)||'overview';
 const id=Object.hasOwn(titles,requested)?requested:'overview';
 for(const panel of document.querySelectorAll('.panel'))panel.hidden=panel.id!==id;
 for(const link of document.querySelectorAll('#navigation a')){
  if(link.hash===`#${id}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 $('#page-label').textContent=titles[id];
 document.title=`${titles[id]} — Аким на 5 часов · Samga AI`;
 if(focus){$('#main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
window.addEventListener('hashchange',()=>showPage({focus:true}));

function renderDistrictTable(){
 $('#district-table').innerHTML=`<caption>Исходные показатели · DOCX, раздел 1</caption><thead><tr><th scope="col">Район</th><th scope="col">Население</th>${indicators.map(i=>`<th scope="col"><abbr title="${i.name}">${i.id}</abbr></th>`).join('')}<th scope="col">Балл D</th></tr></thead><tbody>${baseline.districts.map(d=>`<tr><th scope="row">${d.name}</th><td>${fmt(d.pop*100,0)}%</td>${indicators.map(i=>`<td class="${grade(d.values[i.id])}">${d.values[i.id]}${d.values[i.id]<40?'<span class="sr-only"> — критическое значение</span>':''}</td>`).join('')}<td><b>${fmt(d.score)}</b></td></tr>`).join('')}</tbody>`;
 $('#indicator-glossary').innerHTML=`<div class="glossary">${indicators.map(i=>`<article><span>${i.id}</span><div><h3>${i.name} <small>вес ${fmt(i.weight*100,0)}%</small></h3><p>${i.meaning}</p></div></article>`).join('')}</div>`;
 $('#district-buttons').innerHTML=districts.map(d=>`<button type="button" data-district="${d.name}" aria-pressed="${d.name==='Нура'}">${d.name}</button>`).join('');
 $('#district-buttons').addEventListener('click',event=>{
  const button=event.target.closest('button[data-district]');if(button)renderDistrict(button.dataset.district);
 });
 renderDistrict('Нура');
}
function renderDistrict(name){
 const d=baseline.districts.find(x=>x.name===name);
 for(const button of document.querySelectorAll('[data-district]'))button.setAttribute('aria-pressed',button.dataset.district===name?'true':'false');
 $('#district-detail').innerHTML=`<div class="district-summary"><span class="note-tag">${fmt(d.pop*100,0)}% населения</span><h3>${d.name}</h3><p>${d.profile}</p><strong>${fmt(d.score)}<small>исходный балл района</small></strong><p class="${d.critical.length?'critical-copy':'caption'}">${d.critical.length?`Критические: ${d.critical.join(', ')}. Штраф городу: −${d.critical.length}.`:'Показателей ниже 40 нет.'}</p></div><div class="indicator-bars">${indicators.map(i=>`<div class="indicator-row"><span><b>${i.id}</b> ${i.name}</span><div class="bar-track"><div class="bar-fill ${grade(d.values[i.id])}" style="width:${d.values[i.id]}%"></div><i class="threshold" aria-hidden="true"></i></div><strong>${d.values[i.id]}</strong></div>`).join('')}<p class="caption">Отметка на полосе — порог 40. Штраф действует строго ниже него.</p></div>`;
}
function renderMeasures(group='all'){
 const selected=measures.filter(m=>group==='all'||m.group===group);
 $('#measure-table').innerHTML=`<caption id="measure-count">Показано: ${selected.length} из 14 мероприятий</caption><thead><tr><th scope="col">Мера</th><th scope="col">Охват</th><th scope="col">Цена</th><th scope="col">Лаг</th><th scope="col">Полный эффект</th></tr></thead><tbody>${selected.map(m=>`<tr><th scope="row"><span class="measure-code">${m.id}</span><span>${m.name}<small>${groups[m.group]}</small></span></th><td>${m.type==='city'?'Весь город':'Один район'}</td><td><b>${m.cost}</b></td><td>${m.lag} кв.<small>${fmt((8-m.lag)/8*100,1)}% эффекта</small></td><td>${effectText(m.effects)}</td></tr>`).join('')}</tbody>`;
}
$('#measure-filter').addEventListener('change',e=>renderMeasures(e.target.value));

function renderScenarios(){
 $('#scenario-table').innerHTML=`<caption>База: 52,56 · Все четыре набора валидны по правилам DOCX</caption><thead><tr><th scope="col">Сценарий</th><th scope="col">Бюджет</th><th scope="col">Score</th><th scope="col">Прирост</th><th scope="col">Критических</th></tr></thead><tbody>${scenarios.map(s=>{
  const r=evaluate(s.choices);return `<tr><th scope="row">${s.name}<small>${s.label}</small></th><td>${r.cost} / 100</td><td><b>${fmt(r.score)}</b></td><td class="positive">+${fmt(r.score-baseline.score)}</td><td>${r.critical}</td></tr>`;
 }).join('')}</tbody>`;
 $('#scenario-select').innerHTML=scenarios.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
 renderScenario('source');
}
function renderScenario(id){
 const s=scenarios.find(x=>x.id===id),r=evaluate(s.choices);
 const scenarioMeasures=s.choices.map(c=>({...measures.find(m=>m.id===c.id),district:c.district}));
 $('#scenario-detail').innerHTML=`<div class="scenario-intro"><span class="note-tag">${s.label}</span><h2>${s.name}</h2><p>${s.description}</p></div><div class="scenario-metrics"><div><span>Score</span><strong>${fmt(r.score)}</strong><small>+${fmt(r.score-baseline.score)} к базе</small></div><div><span>Бюджет</span><strong>${r.cost}<small> / 100</small></strong><small>Остаток ${100-r.cost}</small></div><div><span>Критических</span><strong>${r.critical}</strong><small>Было ${baseline.critical}</small></div></div><div class="two-columns scenario-columns"><div><h3>Пять выбранных мер</h3><ol class="choice-list">${scenarioMeasures.map(m=>`<li><span class="measure-code">${m.id}</span><div><b>${m.name}</b><small>${m.district||'Весь город'}</small></div><strong>${m.cost}</strong></li>`).join('')}</ol><div class="synergy-note">${r.synergies.length?r.synergies.map(sy=>`<b>Синергия ${sy.pair}</b><p>${sy.indicator} +${sy.bonus} · ${sy.district}. Фиксированный бонус без лага.</p>`).join(''):'Синергий нет.'}</div></div><div><h3>Что произошло с районами</h3><div class="district-deltas">${r.districts.map((d,i)=>`<div><span>${d.name}</span><span>${fmt(baseline.districts[i].score)} <span aria-hidden="true">→</span> <b>${fmt(d.score)}</b></span><strong class="positive">+${fmt(d.score-baseline.districts[i].score)}</strong></div>`).join('')}</div><div class="score-components"><p><span>Среднее по населению</span><b>${fmt(r.average,4)}</b></p><p><span>Худший район</span><b>${fmt(r.minimum,4)}</b></p><p><span>Штраф</span><b>−${r.critical}</b></p></div><p class="caption">Расчёт по DOCX с полной внутренней точностью. Пояснения на этой странице подготовлены для разбора; живой AI здесь не вызывается.</p></div></div>`;
}
$('#scenario-select').addEventListener('change',e=>renderScenario(e.target.value));
renderDistrictTable();renderMeasures();renderScenarios();showPage();
