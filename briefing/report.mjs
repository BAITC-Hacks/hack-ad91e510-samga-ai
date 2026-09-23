import {calculateScenario,compareScenarios,MODEL_INFO} from '../analytics/scenarios.mjs';
import {groups,measures,indicators} from '../docs/brief-analysis/dist/data.mjs';

const catalog=new Map(measures.map(m=>[m.id,m]));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+fmt(n);

export function buildBrief({choices,comparisonChoices,title='Решение для города'}={}){
 if(typeof title!=='string'||title.length>160)throw new Error('INVALID_SCENARIO: название должно быть короче 160 символов.');
 const scenario=calculateScenario(choices);
 const comparison=comparisonChoices===undefined?null:compareScenarios(comparisonChoices,choices);
 const before=comparison?.left.result??scenario.baseline,after=scenario.result;
 const metrics=after.districts.flatMap(d=>{
  const b=before.districts.find(x=>x.name===d.name);
  return indicators.map(i=>({district:d.name,indicator:i.id,name:i.name,before:b.values[i.id],after:d.values[i.id],delta:d.values[i.id]-b.values[i.id]}));
 });
 const included=new Set(scenario.choices.map(c=>catalog.get(c.id).group));
 return {schemaVersion:1,title,model:MODEL_INFO,scenario,comparison,
  reference:comparison?'План сравнения':'Исходный город',
  measures:scenario.choices.map(c=>{const m=catalog.get(c.id);return {id:m.id,name:m.name,district:c.district??'Весь город',cost:m.cost,lag:m.lag,group:groups[m.group]};}),
  coverage:{included:Object.keys(groups).filter(k=>included.has(k)).map(k=>groups[k]),missing:Object.keys(groups).filter(k=>!included.has(k)).map(k=>groups[k])},
  decomposition:[
   {name:'Средний результат города',contribution:.7*(after.average-before.average)},
   {name:'Положение слабейшего района',contribution:.3*(after.minimum-before.minimum)},
   {name:'Изменение штрафа за критические показатели',contribution:before.critical-after.critical}
  ],
  critical:{resolved:metrics.filter(m=>m.before<40&&m.after>=40),remaining:metrics.filter(m=>m.after<40),new:metrics.filter(m=>m.before>=40&&m.after<40)},
  improvements:metrics.filter(m=>m.delta>0).sort((a,b)=>b.delta-a.delta),
  tradeoffs:metrics.filter(m=>m.delta<0).sort((a,b)=>a.delta-b.delta),
  unchanged:metrics.filter(m=>m.delta===0).sort((a,b)=>a.after-b.after),
  districts:after.districts.map(d=>{const b=before.districts.find(x=>x.name===d.name);return {name:d.name,before:b.score,after:d.score,delta:d.score-b.score,critical:d.critical.length};}),
  ai:{status:'not-included',explanation:'Этот документ сформирован по пересчитанным данным модели. AI-текст в экспорт не включается.'},
  limitations:[...MODEL_INFO.assumptions,'Ноль критических показателей означает только отсутствие значений ниже 40, а не решение всех городских проблем.','Этот план не объявляется оптимальным без отдельного полного поиска с указанными целью и ограничениями.']};
}

export function renderBriefHtml(brief){
 // Rebuild from choices: even a modified JSON report cannot inject fabricated result numbers.
 const b=buildBrief({choices:brief.scenario.choices,comparisonChoices:brief.comparison?.left.choices,title:brief.title});
 const r=b.scenario.result,base=b.comparison?.left.result??b.scenario.baseline;
 const metricRows=items=>items.map(m=>`<li><strong>${esc(m.district)} · ${esc(m.name)}</strong><span>${fmt(m.before)} → ${fmt(m.after)} <small>(${signed(m.delta)})</small></span></li>`).join('');
 return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.title)} | SAMGA</title><style>
 *{box-sizing:border-box}body{margin:0;background:#eef3f7;color:#18344b;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1040px;margin:32px auto;background:#fff;padding:46px 54px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #226b94;padding-bottom:18px}.brand{font-size:25px;font-weight:750;letter-spacing:-1px}.meta{font-size:12px;color:#5b7080;text-align:right}h1{font-size:38px;line-height:1.15;letter-spacing:-1px;margin:30px 0 12px}h2{font-size:19px;margin:0 0 12px}p{max-width:80ch}.intro{color:#5b7080;margin-bottom:26px}.summary{display:grid;grid-template-columns:2fr 1fr 1fr;gap:28px;padding:25px 0;border-block:1px solid #d7e0e7}.summary span{display:block;color:#5b7080;font-size:12px}.number{font-size:38px;font-weight:750;letter-spacing:-1px}.positive{color:#176c53}.negative{color:#a14531}.columns{display:grid;grid-template-columns:1fr 1fr;gap:38px;margin-top:30px}section{margin-top:28px}ul{list-style:none;padding:0;margin:0}li{border-bottom:1px solid #e3eaf0;padding:9px 0}li strong{display:block;font-size:13px}li span{display:block}small,.muted{color:#5b7080;font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:9px 6px;border-bottom:1px solid #dfe7ee}th{color:#5b7080;font-size:12px}td:nth-last-child(-n+2){font-variant-numeric:tabular-nums}.note{background:#edf5f8;border-left:3px solid #226b94;padding:13px 16px;font-size:13px}.warning{background:#fcf5ea;border-left-color:#b68129}.formula div{display:flex;justify-content:space-between;gap:15px;padding:8px 0;border-bottom:1px solid #e3eaf0;font-size:13px}footer{border-top:1px solid #d7e0e7;margin-top:30px;padding-top:16px;font-size:11px;color:#5b7080;overflow-wrap:anywhere}details{margin-top:18px}summary{cursor:pointer;font-weight:600}code{font:11px/1.45 ui-monospace,monospace;overflow-wrap:anywhere}.source-list li{font-size:12px} @media(max-width:700px){main{margin:0;padding:25px}.columns{grid-template-columns:1fr;gap:0}.summary{gap:14px;grid-template-columns:1fr 1fr}.summary>div:first-child{grid-column:1/-1}h1{font-size:30px}.number{font-size:30px}}@media print{body{background:white}main{margin:0;padding:0;max-width:none}header{padding-bottom:10px}h1{font-size:27px;margin-top:18px}.number{font-size:29px}.summary{padding:14px 0}.columns{gap:25px;margin-top:14px}section{margin-top:17px}p,li,td,th{font-size:11px}li{padding:6px 0}section,tr,.note{break-inside:avoid}details{display:none}footer{font-size:9px} @page{size:A4;margin:14mm}}
 </style><body><main><header><div class="brand">SAMGA / Решения для города</div><div class="meta">Учебная модель<br>8 кварталов · бюджет 100</div></header>
 <h1>${esc(b.title)}</h1><p class="intro">Пять решений, их последствия для районов и цена выбранных приоритетов. Сравнение: ${esc(b.reference.toLowerCase())} и выбранный план.</p>
 <div class="summary"><div><span>Индекс качества жизни в модели</span><div class="number">${fmt(base.score)} → ${fmt(r.score)}</div><b class="${r.score>=base.score?'positive':'negative'}">${signed(r.score-base.score)} балла</b></div><div><span>Бюджет выбранного плана</span><div class="number">${r.cost} <small>/ 100</small></div><small>Резерв ${100-r.cost}</small></div><div><span>Критических показателей</span><div class="number">${base.critical} → ${r.critical}</div><small>Значения ниже 40</small></div></div>
 <div class="columns"><section><h2>Основные улучшения</h2><ul>${metricRows(b.improvements.slice(0,4))||'<li>Улучшений относительно выбранной базы нет.</li>'}</ul></section><section><h2>Что потребует внимания</h2>${b.critical.remaining.length?`<p class="negative">Остаётся критических показателей: ${b.critical.remaining.length}.</p><ul>${metricRows(b.critical.remaining)}</ul>`:'<p class="positive">Все показатели выше или равны критическому порогу 40.</p>'}${b.tradeoffs.length?`<p>Все ухудшения относительно выбранной базы:</p><ul>${metricRows(b.tradeoffs)}</ul>`:'<p>Снижения показателей относительно выбранной базы нет.</p>'}<p class="muted">Отсутствие критических значений не означает отсутствие всех проблем. ${b.unchanged.length?'Без изменения: '+esc(b.unchanged[0].district)+' · '+esc(b.unchanged[0].name)+' ('+fmt(b.unchanged[0].after)+').':''}</p></section></div>
 <section><h2>Пять принятых решений</h2><table><thead><tr><th>Мера</th><th>Где</th><th>Цена</th><th>Лаг, кв.</th></tr></thead><tbody>${b.measures.map(m=>`<tr><td>${m.id} · ${esc(m.name)}</td><td>${esc(m.district)}</td><td>${m.cost}</td><td>${m.lag}</td></tr>`).join('')}</tbody></table><p class="muted">Охвачено направлений: ${b.coverage.included.length} из 5.${b.coverage.missing.length?' Не выбраны меры: '+esc(b.coverage.missing.join(', '))+'.':''}</p></section>
 <div class="columns"><section><h2>Последствия по районам</h2><table><thead><tr><th>Район</th><th>Сравнение</th><th>Разница</th></tr></thead><tbody>${b.districts.map(d=>`<tr><td>${esc(d.name)}</td><td>${fmt(d.before)} → ${fmt(d.after)}</td><td>${signed(d.delta)}</td></tr>`).join('')}</tbody></table></section><section><h2>Почему изменился итог</h2><div class="formula">${b.decomposition.map(d=>`<div><span>${esc(d.name)}</span><b>${signed(d.contribution)}</b></div>`).join('')}<div><strong>Итого</strong><strong>${signed(r.score-base.score)}</strong></div></div><p class="muted">70% — среднее с весами населения, 30% — слабейший район, минус 1 за каждый критический показатель. Слагаемые округлены только для показа.</p></section></div>
 <section><div class="note">Практический смысл: сопоставить варианты и увидеть, какие районы и показатели выигрывают при ограниченном бюджете. Утверждение реальной городской программы требует местных данных и проверки эффектов.</div></section>
 <details><summary>Основания и границы применения</summary><ul class="source-list">${b.limitations.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>${esc(b.ai.explanation)}</p></details>
 <footer>Источник коэффициентов: ${esc(b.model.source)}. Версия ${esc(b.model.version)}. Синтетические данные; это не официальный прогноз Астаны.<br>Идентификатор пересчитанного сценария: <code>${esc(b.scenario.scenarioId)}</code><br>HTML содержит весь текст и оформление, не загружает внешние ресурсы. JSON-пакет сохраняет выбор и полный расчёт для повторной проверки.</footer></main></body></html>`;
}
