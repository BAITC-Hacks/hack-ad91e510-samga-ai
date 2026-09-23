const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:2});
const example=[{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
let catalog,current=null,choices=structuredClone(example),saved=null,candidate=null,revision=0,focus=4,tab='overview',before=false;
async function post(path,data){
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const b=await r.json();if(!r.ok)throw new Error(b.error.message+(b.error.details?' '+b.error.details.join(' '):''));return b;
}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function run(fn){return (...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>toast(e.message));}
const byId=id=>catalog.measures.find(m=>m.id===id);
const goalNames={score:'Максимальный Score',cost:'Минимальные расходы',weakest:'Поднять слабейший район',air:'Качество воздуха'};
function constraintsText(c){return goalNames[c.objective]+', бюджет до '+c.maxBudget+', критических не более '+(c.criticalLimit??'без ограничения')+(c.required.length?'; обязательные меры: '+c.required.map(x=>byId(x.id).name+' · '+(x.district??'город')).join(', '):'')+(c.excluded.length?'; исключены: '+c.excluded.map(id=>byId(id).name).join(', '):'');}
function stats(){
 const cost=choices.reduce((s,c)=>s+byId(c.id).cost,0),r=current?.result;
 $('stats').innerHTML=[['Бюджет',cost+' / 100','Остаток '+(100-cost)+' ед.'],['Score · 8 кварталов',r?fmt(r.score):'—','Учебная модель DOCX'],
 ['Слабейший район',r?fmt(r.minimum):'—','Баллы района'],['Критические показатели',r?String(r.critical):'—','Строго ниже 40']].map(([a,b,c])=>'<div class="stat"><label>'+a+'</label><strong>'+b+'</strong><small>'+c+'</small></div>').join('');
 $('export').disabled=!current;$('save').disabled=!current;$('facts').disabled=!current;$('ai-analyze').disabled=!current;
}
const shortNames={M1:'Автобусные полосы',M2:'Умные светофоры',M3:'Линия ЛРТ',M4:'Парк или сквер',M5:'Чистое топливо',M6:'Озеленение города',M7:'Школа и детсад',M8:'Семейная поликлиника',M9:'Дворовые спорт-хабы',M10:'Освещение и камеры',M11:'Безопасные переходы',M12:'Обращения жителей',M13:'Обновление теплосетей и водосетей',M14:'Аварийные бригады'};
let editingId=null,pickedId=null,editVersion=0,draftChoices=null,previewValid=false;
function renderPlan(){
 const cost=choices.reduce((sum,c)=>sum+byId(c.id).cost,0);
 $('count').textContent=choices.length+' из 5';
 $('plan-budget').innerHTML='<div class="between"><strong>'+cost+' <small>из 100 ед.</small></strong><span class="'+(cost>100?'negative':'')+'">Осталось '+(100-cost)+'</span></div><div class="budget-track"><i style="width:'+Math.min(100,cost)+'%;'+(cost>100?'background:#ad4934':'')+'"></i></div>';
 $('plan').innerHTML=choices.map((c,i)=>{const m=byId(c.id);return '<div class="decision-row"><span class="decision-number">'+(i+1)+'</span><div class="decision-info"><button class="decision-name" data-edit="'+m.id+'">'+esc(shortNames[m.id])+'</button><span class="decision-place">'+esc(c.district??'Весь город')+'</span></div><div class="decision-end"><strong>'+m.cost+' <small>ед.</small></strong><button class="replace-link" data-edit="'+m.id+'" aria-label="Заменить '+esc(shortNames[m.id])+'">Заменить</button></div></div>';}).join('')+
 Array.from({length:Math.max(0,5-choices.length)},(_,i)=>'<button class="empty-decision" data-new="true"><span>'+(choices.length+i+1)+'</span>Выбрать решение <b>+</b></button>').join('');
 $('catalog-open').hidden=true;stats();
}
function openEditor(id=null){
 editingId=id;pickedId=id;draftChoices=null;previewValid=false;editVersion++;
 const c=choices.find(c=>c.id===id);
 $('catalog-title').textContent=id?'Изменить решение':'Добавить решение';
 $('catalog-context').textContent=id?'Сейчас: '+shortNames[id]+' · '+(c.district??'весь город')+' · '+byId(id).cost+' ед.':'Выберите проект и район. Общий бюджет — 100 единиц.';
 $('editor-district').innerHTML=catalog.districts.map(d=>'<option '+(d.name===(c?.district??catalog.districts[focus].name)?'selected':'')+'>'+esc(d.name)+'</option>').join('');
 $('filter').value='';$('group').value='';
 $('editor-apply').disabled=true;$('editor-apply').textContent=id?'Сохранить изменения':'Добавить в план';
 $('editor-remove').hidden=!id;$('editor-preview').textContent=id?'Выберите другой проект или измените район.':'Выберите проект из списка.';
 renderCatalog();$('catalog').showModal();$('catalog').scrollTop=0;document.querySelector('.editor-body').scrollTop=0;
}
async function previewEdit(){
 const ticket=++editVersion;
 if(!pickedId)return;
 const m=byId(pickedId),choice=m.type==='city'?{id:m.id}:{id:m.id,district:$('editor-district').value};
 draftChoices=editingId?choices.map(c=>c.id===editingId?choice:{...c}):[...choices,choice];
 $('editor-apply').disabled=true;previewValid=false;
 renderCatalog();
 const delta=draftChoices.reduce((sum,c)=>sum+byId(c.id).cost,0)-choices.reduce((sum,c)=>sum+byId(c.id).cost,0);
 const cost=draftChoices.reduce((sum,c)=>sum+byId(c.id).cost,0);
 const lead='<div class="preview-numbers"><span>План <b>'+cost+' / 100</b></span><span>Изменение бюджета <b>'+(delta>0?'+':'')+delta+' ед.</b></span></div>';
 if(draftChoices.length<5){
  previewValid=cost<=100;$('editor-preview').innerHTML=lead+'<p class="small">'+(previewValid?'Для итогового расчёта выберите ещё '+(5-draftChoices.length)+' решения.':'Недостаточно бюджета для этого проекта.')+'</p>';
  $('editor-apply').disabled=!previewValid;return;
 }
 $('editor-preview').innerHTML=lead+'<p class="small">Проверяем совместимость и последствия…</p>';
 try{
  const r=await post('/api/simulate',{choices:draftChoices});
  if(ticket!==editVersion)return;
  const same=current?.scenarioId===r.scenarioId;
  previewValid=!same;
  $('editor-preview').innerHTML=lead+'<div class="preview-numbers"><span>Score <b>'+(current?fmt(current.result.score)+' → ':'')+fmt(r.result.score)+'</b></span><span>Критических <b>'+r.result.critical+'</b></span></div><p class="small">'+(same?'Это текущее решение. Выберите замену или другой район.':'✓ План допустим. Изменения вступят в силу после сохранения.')+'</p>';
  $('editor-apply').disabled=!previewValid;
 }catch(e){if(ticket!==editVersion)return;$('editor-preview').innerHTML=lead+'<div class="error">'+esc(e.message)+'</div>';}
}
async function calculate(){
 const rev=++revision;current=null;candidate=null;$('candidate').textContent='';$('answer').textContent='';$('validation').textContent='Проверяем план…';renderPlan();
 $('view').innerHTML='<p>Проверяем ограничения и рассчитываем последствия…</p>';
 try{
  const s=await post('/api/simulate',{choices});if(rev!==revision)return;
  current=s;choices=structuredClone(s.choices);$('validation').innerHTML='<span class="positive">✓ Все ограничения соблюдены</span>';
  renderPlan();await renderView();
 }catch(e){if(rev!==revision)return;$('validation').innerHTML='<div class="error">'+esc(e.message)+'</div>';$('view').innerHTML='<div class="notice">Завершите допустимый план из пяти мер. Итоговый Score для неполного или недопустимого набора не рассчитывается.</div>';}
}
const shapes=[
 ['M445 410 L565 428 L671 403 L738 458 L806 561 L701 676 L561 713 L430 694 L517 527Z',621,557],
 ['M758 191 L910 217 L944 359 L936 496 L804 559 L739 458 L671 403 L706 316Z',823,333],
 ['M83 150 L295 66 L443 117 L441 286 L333 352 L193 336 L101 265Z',266,216],
 ['M443 117 L637 80 L758 191 L706 316 L526 325 L441 286Z',589,217],
 ['M97 408 L199 436 L338 379 L445 410 L517 527 L430 694 L224 656 L103 562Z',294,521]
];
function overview(){
 const s=before?current.baseline:current.result,d=current.result.districts[focus],b=current.baseline.districts[focus];
 const color=v=>v<50?'#e6bba5':v<55?'#ded09e':v<60?'#c3d09f':v<65?'#a9c99e':'#94bc98';
 $('view').innerHTML='<div class="mapbox"><div class="map"><div class="between" style="padding:14px"><strong>'+(before?'Исходный город':'Эффект выбранных решений')+'</strong><button id="toggle-map">'+(before?'Показать эффект':'Показать до')+'</button></div><svg viewBox="0 0 1000 760" role="img" aria-label="Условная схема пяти районов">'+shapes.map(([path,x,y],i)=>'<g><path class="'+(focus===i?'selected':'')+'" d="'+path+'" fill="'+color(s.districts[i].score)+'" data-focus="'+i+'" tabindex="0" role="button" aria-label="Район '+catalog.districts[i].name+'"/><text x="'+x+'" y="'+y+'" text-anchor="middle">'+catalog.districts[i].name+'</text><text x="'+x+'" y="'+(y+29)+'" text-anchor="middle">'+fmt(s.districts[i].score)+'</text></g>').join('')+'<path d="M-10 380 Q150 370 200 410 T330 380 T570 405 T750 420 T1020 460" fill="none" stroke="#a7cbd2" stroke-width="17" pointer-events="none"/></svg><small>Схематические границы · районный балл 0–100 · выше лучше</small></div><div class="districtdetail"><h2>'+esc(d.name)+'</h2><div class="metric"><span>Показатель</span><span>До</span><b>Итог</b></div>'+catalog.indicators.map(m=>'<div class="metric"><span>'+esc(m.name)+'</span><span>'+fmt(b.values[m.id])+'</span><b class="'+(d.values[m.id]<40?'negative':d.values[m.id]>b.values[m.id]?'positive':'')+'">'+fmt(d.values[m.id])+'</b></div>').join('')+'</div></div><div class="timeline"><strong>Горизонт расчёта</strong><div class="buttons"><button data-years="1">1 год</button><button data-years="2" class="active">2 года · ТЗ</button><button data-years="5">5 лет</button><button data-years="10">10 лет</button></div><div id="horizon-note"><small>Точный расчёт по формуле DOCX для восьми кварталов. Другие сроки требуют дополнительной модели.</small></div></div>';
 $('toggle-map').onclick=()=>{before=!before;overview();};
}
function comparisonHtml(r){
 const rows=[['Бюджет',r.left.result.cost,r.right.result.cost],['Score',r.left.result.score,r.right.result.score],
 ['Критических показателей',r.left.result.critical,r.right.result.critical],
 ...r.left.result.districts.map((d,i)=>[d.name,d.score,r.right.result.districts[i].score])];
 return '<div class="tablewrap"><table><thead><tr><th>Показатель</th><th>Первый план</th><th>Второй план</th><th>Разница</th></tr></thead><tbody>'+rows.map(([name,a,b])=>'<tr><td>'+esc(name)+'</td><td>'+fmt(a)+'</td><td>'+fmt(b)+'</td><td>'+(b-a>0?'+':'')+fmt(b-a)+'</td></tr>').join('')+'</tbody></table></div><p class="small">Изменения мер: убрать '+esc(r.removed.map(c=>byId(c.id).name+' ('+(c.district??'город')+')').join(', ')||'ничего')+'; добавить '+esc(r.added.map(c=>byId(c.id).name+' ('+(c.district??'город')+')').join(', ')||'ничего')+'.</p>'+r.metrics.filter(m=>m.delta<0).map(m=>'<p class="negative small">Компромисс: '+esc(m.district)+' · '+esc(m.name)+' '+fmt(m.before)+' → '+fmt(m.after)+'.</p>').join('');
}
function evidenceHtml(r){return '<p class="small">'+esc(r.notice)+'</p>'+r.cards.map(c=>'<article class="evidencecard"><small>'+esc(c.publisher)+' · '+esc(c.published??'Дата публикации не указана')+' · проверено '+c.reviewedAt+'</small><h3><a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.title)+' ↗</a></h3><p>'+esc(c.summary)+'</p><div class="notice">'+esc(c.limit)+'</div><small>Контекст и механизм · не численный коэффициент для Астаны</small></article>').join('')+(r.gaps.length?'<div class="notice">В текущей базе нет внешнего обоснования для '+esc(r.gaps.map(id=>byId(id).name).join(', '))+'. Эффекты этих мер заданы только учебным DOCX.</div>':'');}
async function renderView(){
 if(!current)return;const rev=revision,expectedTab=tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='overview'){overview();return;}
 if(tab==='compare'){
  if(!saved){$('view').innerHTML='<div class="notice">Сохраните текущий план кнопкой слева, измените решения и откройте сравнение.</div>';return;}
  const r=await post('/api/compare',{left:saved.choices,right:choices});if(rev!==revision||tab!==expectedTab)return;
  $('view').innerHTML='<h2 style="margin-bottom:15px">Сохранённый план → текущий</h2>'+comparisonHtml(r);return;
 }
 const r=await post('/api/evidence',{measureIds:choices.map(c=>c.id)});if(rev!==revision||tab!==expectedTab)return;
 $('view').innerHTML='<div class="formula"><h2>Проверяемая модель</h2><p>Score = 0,7 × средний балл + 0,3 × слабейший район − число критических показателей.</p><p>Эффект меры: (8 − лаг) / 8. Синергии без лага. Шкала 0–100. Средний балл учитывает доли населения.</p><p>Рабочие правила DOCX; неоднозначность PDF о пяти направлениях ещё требует уточнения.</p><small>Версия '+esc(catalog.model.version)+' · '+esc(current.scenarioId)+'</small></div>'+evidenceHtml(r);
}
function renderCatalog(){
 const query=$('filter').value.toLocaleLowerCase('ru'),group=$('group').value,old=editingId?byId(editingId):null;
 $('catalog-list').innerHTML=catalog.measures.filter(m=>(!group||m.group===group)&&(m.name+' '+shortNames[m.id]).toLocaleLowerCase('ru').includes(query)).sort((a,b)=>{const rank=m=>m.id===editingId?-2:choices.some(c=>c.id===m.id)?2:old&&m.group===old.group?-1:0;return rank(a)-rank(b);}).map(m=>{
 const occupied=choices.some(c=>c.id===m.id&&c.id!==editingId),selected=pickedId===m.id,difference=m.cost-(old?.cost??0);
 return '<article class="project-option '+(selected?'selected':'')+'"><button class="project-pick" data-pick="'+m.id+'" '+(occupied?'disabled':'')+' aria-pressed="'+selected+'"><span class="project-check">'+(selected?'✓':'')+'</span><span class="project-copy"><strong>'+esc(shortNames[m.id])+'</strong><small>'+esc(catalog.groups[m.group])+' · '+(m.type==='city'?'Весь город':esc($('editor-district').value))+'</small></span><span class="project-price"><b>'+m.cost+' ед.</b><small>'+(occupied?'Уже в плане':m.id===editingId?'Текущее':old?(difference>0?'+':'')+difference+' к бюджету':'')+'</small></span></button><details class="project-details"><summary>Что изменится</summary><p>'+esc(m.name)+'. Срок до начала эффекта: '+m.lag+' квартала.</p><p>'+Object.entries(m.effects).map(([id,v])=>esc(catalog.indicators.find(x=>x.id===id).name)+': '+(v>0?'+':'')+v).join(' · ')+'.</p><small>Эффекты каталога; итог рассчитывается с учётом лага и синергий.</small></details></article>';
 }).join('')||'<p>Ничего не найдено. Измените поиск или направление.</p>';
}
function analysisHtml(r){const a=r.analysis;return '<div class="notice">'+(r.mode==='openai'?'AI выбрал значимые факты; текст и числа проверены сервером.':r.mode==='demo'?'Демонстрационный ответ, без вызова AI.':'Проверенный разбор по правилам модели, без вызова AI.')+'</div><p>'+esc(a.summary)+'</p>'+[['strengths','Улучшения'],['risks','Риски и ограничения'],['recommendations','Следующая гипотеза']].map(([k,t])=>'<h3>'+t+'</h3><ul>'+a[k].map(x=>'<li>'+esc(x.text)+' <button class="source-link" data-tab="evidence">Основание</button></li>') .join('')+'</ul>').join('');}
async function explanation(ai=false){
 if(!current)return;const s=current,rev=revision;$('answer').textContent=ai?'AI выбирает значимые факты…':'Готовим проверенный разбор…';
 try{const r=await post(ai?'/api/analyze':'/api/facts',ai?s:{choices:s.choices});
 if(rev!==revision||current?.scenarioId!==r.scenarioId)return;$('answer').innerHTML=analysisHtml(r);}
 catch(e){if(rev===revision)$('answer').innerHTML='<div class="notice">'+esc(e.message)+'</div>';}
}
function showCandidate(r){
 candidate=r.scenario;if(!candidate){$('candidate').innerHTML='<div class="notice">Допустимый план при этих условиях не найден.</div>';return;}
 const s=r.scenario;$('candidate').innerHTML='<div class="result"><div class="between"><h3>'+s.result.cost+' ед. · Score '+fmt(s.result.score)+'</h3><button id="apply" class="primary">Применить вариант</button></div><p class="small">Цель: '+esc(goalNames[r.constraints.objective])+' · бюджет до '+r.constraints.maxBudget+' · критических не более '+(r.constraints.criticalLimit??'без ограничения')+'. Проверено '+r.validCount.toLocaleString('ru-RU')+' допустимых назначений. Оптимум только при этих условиях.</p><ul>'+s.choices.map(c=>'<li>'+esc(byId(c.id).name)+' · '+esc(c.district??'весь город')+'</li>').join('')+'</ul><div id="candidate-diff"></div></div>';
 $('apply').onclick=run(async()=>{saved=current?structuredClone(current):saved;choices=structuredClone(candidate.choices);await calculate();toast('Вариант применён. Предыдущий план сохранён для сравнения.');});
}
async function findPlan(){
 const rev=revision;$('search').disabled=true;$('candidate').textContent='Перебираем допустимые планы…';
 try{
 const r=await post('/api/search',{objective:$('objective').value,maxBudget:Number($('budget').value),
 criticalLimit:$('critical').checked?0:null,required:$('school').checked?[{id:'M7',district:'Нура'}]:[],excluded:[]});
 if(rev!==revision)return;showCandidate(r);
 if(current&&candidate){const comp=await post('/api/compare',{left:current.choices,right:candidate.choices});if(rev===revision&&$('candidate-diff'))$('candidate-diff').innerHTML=comparisonHtml(comp);}
 }catch(e){if(rev===revision)$('candidate').innerHTML='<div class="error">'+esc(e.message)+'</div>';}
 finally{$('search').disabled=false;}
}
async function ask(event){
 event.preventDefault();if(!current){toast('Сначала соберите допустимый план.');return;}
 const rev=revision;$('answer').textContent='Помощник проверяет запрос…';
 try{
 const r=await post('/api/assistant',{question:$('question').value,choices,...(saved?{comparisonChoices:saved.choices}:{})});
 if(rev!==revision||r.scenarioId!==current?.scenarioId)return;
 if(r.search){showCandidate(r.search);$('answer').innerHTML='<p>'+esc(r.message)+'</p><p class="small">Проверьте условия поиска: '+esc(constraintsText(r.interpretation))+'</p>';}
 else if(r.comparison)$('answer').innerHTML=comparisonHtml(r.comparison);
 else if(r.evidence)$('answer').innerHTML=evidenceHtml(r.evidence);
 else if(r.analysis)$('answer').innerHTML=analysisHtml(r);
 else $('answer').innerHTML='<div class="notice">'+esc(r.message)+'</div>';
 }catch(e){if(rev===revision)$('answer').innerHTML='<div class="notice">'+esc(e.message)+'</div>';}
}
document.addEventListener('click',run(async e=>{
 const el=e.target.closest('button,[data-focus]');if(!el)return;
 if(el.dataset.edit){openEditor(el.dataset.edit);}
 if(el.dataset.new){openEditor();}
 if(el.dataset.pick){pickedId=el.dataset.pick;await previewEdit();}
 if(el.dataset.focus!==undefined){focus=Number(el.dataset.focus);overview();}
 if(el.dataset.tab){tab=el.dataset.tab;await renderView();}
 if(el.dataset.years){
  const years=Number(el.dataset.years);
  $('horizon-note').innerHTML=years===2?'<small>Показан расчёт по ТЗ на восемь кварталов.</small>':'<div class="notice">Для горизонта '+years+' '+(years===1?'год':'лет')+' нет проверенной модели. Показатели выше относятся только к двум годам; новый прогноз не создаётся.</div>';
 }
}));
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.focus!==undefined){focus=Number(e.target.dataset.focus);overview();}});
$('catalog-open').onclick=()=>openEditor();
function closeEditor(){editVersion++;$('catalog').close();}
$('catalog-close').onclick=closeEditor;$('editor-cancel').onclick=closeEditor;
$('catalog').addEventListener('cancel',()=>{editVersion++;});
$('editor-district').onchange=run(previewEdit);
$('editor-apply').onclick=run(async()=>{if(!previewValid||!draftChoices)return;const updated=structuredClone(draftChoices);closeEditor();choices=updated;await calculate();toast('Решение обновлено. Последствия пересчитаны.');});
$('editor-remove').onclick=run(async()=>{if(!editingId)return;choices=choices.filter(c=>c.id!==editingId);closeEditor();await calculate();toast('Решение убрано. Выберите проект в свободной строке.');});
$('filter').oninput=renderCatalog;$('group').onchange=renderCatalog;
$('example').onclick=run(async()=>{choices=structuredClone(example);await calculate();});
$('save').onclick=()=>{saved=structuredClone(current);toast('План сохранён. Измените решения и откройте сравнение.');};
$('facts').onclick=run(()=>explanation(false));$('ai-analyze').onclick=run(()=>explanation(true));
$('search').onclick=run(findPlan);$('question-form').onsubmit=e=>{e.preventDefault();run(ask)(e);};
$('export').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify({model:catalog.model,scenario:current,comparison:saved},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='samga-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{
 const [c,h]=await Promise.all([fetch('/api/catalog').then(r=>r.json()),fetch('/api/health').then(r=>r.json())]);
 catalog=c;$('group').innerHTML+=Object.entries(c.groups).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
 $('connection').textContent='Модель DOCX · 8 кварталов';$('ai-label').textContent=h.aiMode==='openai'&&h.aiConfigured?'AI настроен · доступ не проверен':'AI ещё не подключён';
 await calculate();
}catch(e){$('connection').textContent='Сервер недоступен';$('validation').textContent=e.message;}
