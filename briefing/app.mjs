import {createBriefingSession} from './session.mjs';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const signed=n=>(n>0?'+':'')+fmt(n);
const plans={
 source:[{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}],
 capital:[{id:'M7',district:'Есиль'},{id:'M8',district:'Есиль'},{id:'M10',district:'Есиль'},{id:'M12'},{id:'M5',district:'Есиль'}],
 coverage:[{id:'M1',district:'Нура'},{id:'M4',district:'Сарыарка'},{id:'M7',district:'Нура'},{id:'M10',district:'Нура'},{id:'M14'}]
};
async function request(path,body){
 let response;
 try{response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});}
 catch{throw new Error('Нет ответа сервера. Проверьте запуск приложения и повторите действие.');}
 const data=await response.json();
 if(!response.ok)throw new Error([data.error?.message,...(data.error?.details??[])].filter(Boolean).join(' ')||'Запрос не выполнен.');
 return data;
}
function lines(items,limit=4){return items.length?'<ul>'+items.slice(0,limit).map(m=>`<li><b>${esc(m.district)} · ${esc(m.name)}</b><span>${fmt(m.before)} → ${fmt(m.after)} (${signed(m.delta)})</span></li>`).join('')+'</ul>':'';}
let lastBrief=null;
const session=createBriefingSession({request,onChange:render});
function render(s){
 $('search').disabled=s.busy;
 $('search').textContent=s.busy?'Проверяем варианты…':'Найти лучший допустимый план';
 $('use-example').disabled=s.busy;
 $('download-html').disabled=!s.html||s.busy;
 $('download-json').disabled=!s.brief||s.busy;
 $('open-map').setAttribute('aria-disabled',String(!s.brief||s.busy));
 $('notice').classList.toggle('error',Boolean(s.error));
 $('notice').textContent=s.error||(s.busy?'Выполняем расчёт. Результат появится после завершения проверки.':'Все числа пересчитаны по исходным данным задания. Измените условия и проверьте другую стратегию.');
 if(s.search){const p=s.search,c=p.constraints;
  $('search-proof').innerHTML=`<div class="proof"><strong>${p.status==='optimal'?'Полный поиск завершён':'Решение не найдено'}</strong><span>Проверено допустимых планов: ${fmt(p.validCount)}. Условия выполнили: ${fmt(p.eligibleCount)}.<br>Расход ≤ ${fmt(c.maxBudget)}${c.criticalLimit===0?' · без критических показателей':''}${c.required?.length?' · школа в Нуре обязательна':''}.</span></div>`;
 }else $('search-proof').textContent='';
 if(!s.brief){
  $('open-map').href='/';
  if(!s.busy){for(const id of ['headline','districts','benefits','tradeoffs','measures','decomposition'])$(id).textContent='';}
  return;
 }
 if(lastBrief===s.brief)return;lastBrief=s.brief;
 const b=s.brief,r=b.scenario.result,ref=b.comparison?.left.result??b.scenario.baseline;
 $('plan-title').textContent=s.title;
 $('comparison-caption').textContent=`${$('reference').selectedOptions[0].textContent} → выбранный план`;
 $('reference-summary').innerHTML=`<span>Расход <strong>${ref.cost}</strong></span><span>Индекс <strong>${fmt(ref.score)}</strong></span>`;
 $('headline').innerHTML=`<div class="headline"><div><span>Индекс качества жизни</span><strong><small>${fmt(ref.score)} → </small>${fmt(r.score)}</strong><p class="${r.score>=ref.score?'positive':'negative'}">${signed(r.score-ref.score)} балла к плану сравнения</p></div><div><span>Расход бюджета</span><strong>${r.cost}<small> / 100</small></strong><p>${r.cost===ref.cost?'Тот же бюджет':signed(r.cost-ref.cost)+' к расходам'} · резерв ${100-r.cost}</p></div><div><span>Критических показателей</span><strong><small>${ref.critical} → </small>${r.critical}</strong><p>Значения строго ниже 40</p></div></div>`;
 $('districts').innerHTML='<div class="legend"><span>Черта — план сравнения</span><span>Полоса — выбранный план · шкала 0–100</span></div>'+b.districts.map(d=>`<div class="district-row"><b>${esc(d.name)}</b><div class="district-bar" style="--before:${d.before}%;--after:${d.after}%" role="img" aria-label="${esc(d.name)}: ${fmt(d.before)} → ${fmt(d.after)}"><i></i><b></b></div><span class="district-values">${fmt(d.before)} → <b>${fmt(d.after)}</b></span></div>`).join('');
 $('benefits').innerHTML=lines(b.improvements)||'<p>Улучшений нет.</p>';
 if(b.critical.resolved.length)$('benefits').innerHTML+=`<p class="positive">${b.critical.resolved.length} показателя вышли из критической зоны.</p>`;
 $('tradeoffs').innerHTML=(b.tradeoffs.length?lines(b.tradeoffs,Infinity):'<p>Снижения показателей относительно плана сравнения нет.</p>')+(b.critical.remaining.length?`<p class="negative">Остаются ниже 40:</p>${lines(b.critical.remaining,Infinity)}`:'<p class="positive">Значений ниже 40 не осталось.</p>')+`<p class="muted">${b.coverage.missing.length?'Без мер в направлении: '+esc(b.coverage.missing.join(', '))+'.':'Представлены все пять направлений.'} Ноль критических показателей не означает, что все проблемы решены.</p>`;
 $('measures').innerHTML=`<table><thead><tr><th>Мера</th><th>Где</th><th>Цена</th></tr></thead><tbody>${b.measures.map(m=>`<tr><td>${m.id} · ${esc(m.name)}</td><td>${esc(m.district)}</td><td>${m.cost}</td></tr>`).join('')}</tbody></table>`;
 $('decomposition').innerHTML='<h3 style="margin-top:20px">Из чего складывается изменение индекса</h3>'+b.decomposition.map(d=>`<div class="contribution"><span>${esc(d.name)}</span><b>${signed(d.contribution)}</b></div>`).join('');
 $('open-map').href='/demos/astana-story/main.html?plan='+encodeURIComponent(JSON.stringify(b.scenario.choices));
}
function download(contents,type,name){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download-html').onclick=()=>{if(session.state.html&&!session.state.busy)download(session.state.html,'text/html;charset=utf-8','samga-decision.html');};
$('download-json').onclick=()=>{if(session.state.brief&&!session.state.busy)download(JSON.stringify(session.state.brief,null,2),'application/json;charset=utf-8','samga-decision.json');};
$('open-map').onclick=e=>{if(!session.state.brief||session.state.busy)e.preventDefault();};
$('reference').onchange=()=>session.compare(plans[$('reference').value]);
$('use-example').onclick=()=>session.select(plans.source,{title:'Помочь там, где проблемы острее'});
$('search-form').onsubmit=e=>{e.preventDefault();session.search({objective:$('objective').value,maxBudget:Number($('max-budget').value),criticalLimit:$('critical-free').checked?0:null,required:$('school').checked?[{id:'M7',district:'Нура'}]:[],excluded:[]});};
try{
 const query=new URLSearchParams(location.search).get('plan');
 const initial=query?JSON.parse(query):plans.source;
 await session.select(initial,{title:query?'Ваш план и его последствия':'Помочь там, где проблемы острее',comparisonChoices:plans.capital});
}catch{ $('notice').className='notice error';$('notice').textContent='Не удалось прочитать план из ссылки. Откройте пример из задания или вернитесь к карте.';}
