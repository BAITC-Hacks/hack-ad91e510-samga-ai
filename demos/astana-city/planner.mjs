import {createPlannerSession} from './session.mjs';
import {esc} from '../../frontend/lib/format.mjs';

const $=id=>document.getElementById(id);
const fmt=(n,digits=2)=>n.toLocaleString('ru-RU',{maximumFractionDigits:digits});
const delta=n=>(n>0?'+':'')+fmt(n);
const tone=n=>n>0?'positive':n<0?'negative':'';
const icons={T:'↗',E:'♧',S:'▤',B:'◉',C:'⌘'};

export function initPlanner({onState,onMap}){
 let filter='',renderedResult=null;
 const districtChoices=new Map();
 const session=createPlannerSession({onChange:render});
 const showPlan=()=>{if(!$('plan-dialog').open)$('plan-dialog').showModal();};
 const showResult=()=>{if(session.state.simulation&&!$('result-dialog').open)$('result-dialog').showModal();};

 function render(state){
  const ready=Boolean(state.catalog),full=state.choices.length===5;
  $('connection-status').textContent=ready?'Серверный расчёт · учебная модель':'Сервер недоступен';
  $('edit-plan').disabled=!ready;
  $('choice-count').textContent=`Выбрано ${state.choices.length} из 5 мер`;
  $('edit-plan').textContent=state.choices.length?'Изменить меры →':'Выбрать меры →';
  $('budget').innerHTML=`${state.spent} <small>/ 100</small>`;
  $('budget-rest').textContent=`${100-state.spent} ед. в резерве`;
  document.querySelector('.budget-track i').style.width=state.spent+'%';
  $('apply').disabled=!ready||state.busy;
  const actionLabel=state.busy?'Рассчитываем…':state.simulation?'Результат':full?'Рассчитать план':'Выбрать 5 мер';
  $('apply').innerHTML=`${actionLabel}<span>↗</span>`;
  $('decisions').innerHTML=state.choices.length?state.choices.map(c=>{
   const m=state.catalog.measures.find(m=>m.id===c.id);
   return `<div class="decision"><span class="decision-icon">${icons[m.group]}</span><span class="decision-name">${esc(m.name)}</span><span class="decision-district">${esc(c.district??'Весь город')} <span class="decision-price">· ${m.cost}</span></span></div>`;
  }).join(''):`<p class="decision empty">${esc(ready?'Начните с районов: выберите, где улучшения нужны больше всего. План пока пуст.':state.error||'Загружаем исходные данные…')}</p>`;
  if(ready){renderCatalog(state);renderPlan(state);renderResult(state);}
  onState(state);
 }
 function renderCatalog(state){
  $('catalog-filter').innerHTML=[['','Все меры'],...Object.entries(state.catalog.groups)].map(([id,name])=>`<button data-filter="${id}" class="${filter===id?'active':''}" aria-pressed="${filter===id}">${esc(name)}</button>`).join('');
  $('measure-catalog').innerHTML=state.catalog.measures.filter(m=>!filter||m.group===filter).map(m=>{
   const district=districtChoices.get(m.id)||'',chosen=state.choices.some(c=>c.id===m.id);
   const choice=m.type==='district'?{id:m.id,district}:{id:m.id};
   const reason=session.reason(choice);
   const effects=Object.entries(m.effects).map(([key,value])=>`${esc(state.catalog.indicators.find(i=>i.id===key).name)} ${delta(value)}`).join(' · ');
   return `<article class="measure-card${chosen?' chosen':''}" data-measure="${m.id}"><div class="measure-top"><span>${m.id} · ${esc(state.catalog.groups[m.group])}</span><strong class="measure-price">${m.cost}</strong></div><h3>${esc(m.name)}</h3><p class="measure-effects">${effects}</p><p class="measure-lag">Лаг ${m.lag} кв. · за 8 кварталов реализуется ${fmt((8-m.lag)/8*100)}% прямого эффекта</p><div class="measure-controls">${m.type==='district'?`<label for="district-${m.id}">Район для ${m.id}</label><select id="district-${m.id}" data-district="${m.id}" ${chosen?'disabled':''}><option value="">Выберите район</option>${state.catalog.districts.map(d=>`<option ${district===d.name?'selected':''} value="${esc(d.name)}">${esc(d.name)}</option>`).join('')}</select>`:'<p class="measure-lag">Действует на весь город</p>'}<button class="add-measure" data-add="${m.id}" ${reason?'disabled':''}>${chosen?'Добавлено':'Добавить '+m.id}</button><p class="measure-reason">${esc(chosen?'':reason)}</p></div></article>`;
  }).join('');
 }
 function renderPlan(state){
  $('plan-count').textContent=state.choices.length+' / 5';
  $('plan-budget').textContent=state.spent+' / 100';
  $('plan-reserve').textContent='Останется '+(100-state.spent)+' единиц. Остаток не даёт бонуса.';
  $('selected-plan').innerHTML=state.choices.length?state.choices.map(c=>{
   const m=state.catalog.measures.find(m=>m.id===c.id);
   return `<div class="selected-measure"><div>${esc(m.name)}<small>${m.id} · ${esc(c.district??'Весь город')} · ${m.cost} ед.</small></div><button class="remove-measure" data-remove="${m.id}" aria-label="Удалить ${m.id}">×</button></div>`;
  }).join(''):'<p class="empty-plan">Добавляйте меры из каталога. Цена и ограничения видны до выбора.</p>';
  $('plan-error').textContent=state.error;
  $('calculate-plan').disabled=state.choices.length!==5||state.busy;
  $('calculate-plan').textContent=state.busy?'Считаем на сервере…':'Рассчитать результат →';
  $('clear-plan').disabled=!state.choices.length;
 }
 function renderResult(state){
  const s=state.simulation;if(!s)return;
  if(renderedResult!==s){
   renderedResult=s;const b=s.baseline,r=s.result;
   $('result-overview').innerHTML=`<div class="result-overview"><div class="result-stat"><span>Индекс качества жизни / 100</span><div class="result-score-line"><span>${fmt(b.score)}</span><span>→</span><strong>${fmt(r.score)}</strong></div><p class="${tone(r.score-b.score)}">${delta(r.score-b.score)} балла к исходному состоянию</p></div><div class="result-stat"><span>Расход бюджета</span><strong>${r.cost} / 100</strong><p>В резерве ${100-r.cost}</p></div><div class="result-stat"><span>Критических показателей</span><strong>${b.critical} → ${r.critical}</strong><p>Значения строго ниже 40</p></div></div>`;
   $('district-comparison').innerHTML=table(['Район','До','После','Разница'],r.districts.map((d,i)=>[d.name,fmt(b.districts[i].score),fmt(d.score),`<span class="${tone(d.score-b.districts[i].score)}">${delta(d.score-b.districts[i].score)}</span>`]));
   $('result-district').innerHTML=r.districts.map(d=>`<option value="${esc(d.name)}">${esc(d.name)}</option>`).join('');
   $('result-district').value='Нура';renderMetrics(state);
   $('synergies').innerHTML=r.synergies.length?`<p class="synergy-list">${r.synergies.map(x=>`${esc(x.pair)}: +${x.bonus} к ${esc(x.indicator)} · ${esc(x.district)}`).join('<br>')}</p>`:'';
   $('formula-values').textContent=`0,7 × ${fmt(r.average,8)} + 0,3 × ${fmt(r.minimum,8)} − ${r.critical} = ${fmt(r.score,8)}. База: ${fmt(b.score,8)}.`;
  }
  const a=state.analysis;
  $('ai-mode').textContent=state.aiBusy?'Ожидание':a?.mode==='openai'?'Живой AI':a?.mode==='demo'?'Без LLM':'AI не проверен';
  $('analyze-plan').disabled=state.aiBusy;
  $('analyze-plan').textContent=state.aiBusy?'Готовим объяснение…':state.aiError?'Повторить AI-анализ':'Получить AI-объяснение';
  if(state.aiBusy)$('ai-output').innerHTML='<p class="loading-message">AI выбирает сильные стороны, риски и следующий шаг по рассчитанным данным…</p>';
  else if(state.aiError)$('ai-output').innerHTML=`<p class="ai-warning">${esc(state.aiError)}</p><p>Ваш расчёт сохранён. Можно изменить план или повторить анализ.</p>`;
  else if(a){
   const report=a.analysis;
   $('ai-output').innerHTML=`${a.mode!=='openai'?'<p class="ai-warning">Это проверка подключения в деморежиме, без вызова LLM.</p>':''}<p>${esc(report.summary)}</p>${[['Сильные стороны','strengths'],['Риски и ограничения','risks'],['Компромиссы и следующий шаг','recommendations']].filter(([,key])=>report[key]?.length).map(([title,key])=>`<h4>${title}</h4><ul>${report[key].map(x=>`<li>${esc(x.text)}</li>`).join('')}</ul>`).join('')}`;
  }else{
   const connected=state.health?.aiMode==='openai'&&state.health?.aiConfigured;
   $('ai-output').innerHTML=`<p>Сравните улучшения, оставшиеся критические показатели и расход бюджета. AI поможет выделить наиболее важные последствия выбранных мер.</p>${connected?'<p>Доступ настроен. Нажмите кнопку для запроса живого объяснения.</p>':'<p class="ai-warning">Живой AI ещё не подключён. Расчёт и сравнение доступны; кнопка проверит текущий режим анализа.</p>'}`;
  }
 }
 function table(head,rows){return `<table class="comparison-table"><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
 function renderMetrics(state){
  const {baseline,result}=state.simulation,name=$('result-district').value;
  const b=baseline.districts.find(d=>d.name===name),r=result.districts.find(d=>d.name===name);
  $('metric-comparison').innerHTML=table(['Показатель','До','После'],state.catalog.indicators.map(i=>[esc(i.name),fmt(b.values[i.id]),`<span class="${r.values[i.id]<40?'negative':tone(r.values[i.id]-b.values[i.id])}">${fmt(r.values[i.id])}</span>`]));
 }
 async function calculate(){
  await session.calculate();
  if(session.state.simulation){$('plan-dialog').close();showResult();}
  else showPlan();
 }
 $('edit-plan').onclick=showPlan;
 $('apply').onclick=()=>session.state.simulation?showResult():session.state.choices.length===5?calculate():showPlan();
 $('calculate-plan').onclick=calculate;
 $('clear-plan').onclick=()=>session.clear();
 $('catalog-filter').onclick=e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;renderCatalog(session.state);}};
 $('measure-catalog').onchange=e=>{if(e.target.dataset.district){districtChoices.set(e.target.dataset.district,e.target.value);renderCatalog(session.state);}};
 $('measure-catalog').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const m=session.state.catalog.measures.find(m=>m.id===b.dataset.add);session.add(m.type==='city'?{id:m.id}:{id:m.id,district:districtChoices.get(m.id)});};
 $('selected-plan').onclick=e=>{const b=e.target.closest('[data-remove]');if(b)session.remove(b.dataset.remove);};
 $('result-district').onchange=()=>renderMetrics(session.state);
 $('analyze-plan').onclick=()=>session.analyze();
 $('change-plan').onclick=()=>{$('result-dialog').close();showPlan();};
 $('show-on-map').onclick=()=>{$('result-dialog').close();onMap();};
 for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
 session.load().then(()=>{
  const encoded=new URL(location.href).searchParams.get('plan');
  if(!encoded||!session.state.catalog)return;
  let choices;
  try{choices=encoded.length<=3000?JSON.parse(encoded):null;}catch{choices=null;}
  session.importChoices(choices);showPlan();
 });
 return session;
}
