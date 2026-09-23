import {measures,districts,groups,indicators,scenarios} from '../../docs/brief-analysis/dist/data.mjs';
import {evaluate,validate} from '../../docs/brief-analysis/dist/model.mjs';
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const sign=n=>(n>0?'+':'')+fmt(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={M1:'Автобусные полосы',M2:'Умные светофоры',M3:'Линия ЛРТ',M4:'Парк и сквер',M5:'Чистое топливо',M6:'Озеленение города',M7:'Школа и детсад',M8:'Поликлиника',M9:'Спортивные дворы',M10:'Свет и камеры',M11:'Безопасные переходы',M12:'Обращения жителей',M13:'Тепло и водоснабжение',M14:'Бригады ЖКХ'};
const humanError=text=>text.replace(/\bM\d+\b/g,id=>titles[id]??id);
const shortGroups={T:'Транспорт',E:'Экология',S:'Соцсфера',B:'Безопасность',C:'Сервисы'};
const icons={T:'↗',E:'♧',S:'▤',B:'◉',C:'⌘'};
async function api(path,body){
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const data=await response.json();
 if(!response.ok)throw new Error([data.error?.message,...(data.error?.details??[])].filter(Boolean).join(' ')||'Сервис недоступен.');
 return data;
}
export function mountSimulator({getState,updatePlan,showImpact}){
 let online=false,aiReady=false,view=0,busy=false,saved=null;
 const dialog=$('workspace'),body=$('workspace-body');
 try{const stored=JSON.parse(localStorage.getItem('samga-city-saved'));if(stored&&!validate(stored).length)saved=stored;}catch{}
 const notify=message=>{$('announcement').textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('announcement').textContent='',5500);};
 function open(title){view++;$('workspace-title').textContent=title;body.replaceChildren();if(!dialog.open)dialog.showModal();return view;}
 $('close-workspace').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>view++);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 api('health').then(h=>{online=h.status==='ok';aiReady=h.aiMode==='openai'&&h.aiConfigured;document.querySelector('.demo-tag').innerHTML='<i></i> Учебная модель · 2 года';}).catch(()=>{document.querySelector('.demo-tag').textContent='Локальная модель · 2 года';});
 function renderPlan(){
  const {choices,result}=getState();
  $('decisions').replaceChildren(...choices.map((c,index)=>{
   const m=measures.find(m=>m.id===c.id),button=document.createElement('button');
   button.className='decision';button.setAttribute('aria-label','Изменить проект '+(index+1)+': '+titles[c.id]);
   button.innerHTML='<span class="decision-top"><span class="decision-icon">'+icons[m.group]+'</span><span class="decision-group">'+shortGroups[m.group]+'</span><span class="edit-mark">↗</span></span><span class="decision-name">'+titles[c.id]+'</span><span class="decision-district">'+(c.district??'Весь город')+'</span><span class="decision-price">'+m.cost+' ед.</span>';
   button.onclick=()=>edit(index);return button;
  }));
  $('budget').textContent=result.cost;
  $('budget-left').textContent=100-result.cost;
  $('budget-rest').textContent='Из 100 ед. · 5 решений';
  document.querySelector('.budget-track i').style.width=result.cost+'%';
 }
 async function accept(next,button){
  if(busy)return;busy=true;button.disabled=true;
  const token=view;
  try{
   if(online)await api('simulate',{choices:next});
   else {const errors=validate(next);if(errors.length)throw new Error(errors.join(' '));}
   if(token!==view)return;
   updatePlan(next);dialog.close();showImpact();notify('План обновлён. На карте — результат через 2 года.');
  }catch(error){if(token===view){const el=$('action-error');if(el)el.textContent=humanError(error.message);else notify(error.message);}}
  finally{busy=false;button.disabled=false;}
 }
 function sourceExample(){
  const source=scenarios.find(s=>s.id==='source').choices;
  const sample=evaluate(source),{result}=getState();
  open('Пример из задания · 95 из 100');
  body.innerHTML='<p class="dialog-intro">Пять мер из примера организаторов: школа, поликлиника и безопасность в Нуре; чистое топливо в Сарыарке; цифровые обращения для всего города. Останется 5 единиц.</p>'+
   '<div class="comparison-grid"><section><span class="eyebrow">ВАШ ПЛАН</span><h3>'+fmt(result.score)+' балла</h3><ul class="plan-description">'+planDescription(getState().choices)+'</ul></section>'+
   '<section><span class="eyebrow">ПРИМЕР ИЗ ЗАДАНИЯ</span><h3>'+fmt(sample.score)+' балла</h3><ul class="plan-description">'+planDescription(source)+'</ul></section></div>'+
   '<div class="metric-table">'+summaryRows(result,sample)+'</div>'+
   '<p class="dialog-intro">Это иллюстрация расчёта, а не доказанный лучший план. Расхождение PDF и DOCX о направлениях ещё требует уточнения.</p>'+
   '<button id="use-source" class="primary">Взять пример и посмотреть город</button><p id="action-error" class="error-text" role="alert"></p>';
  $('use-source').onclick=e=>accept(source,e.currentTarget);
 }
 $('load-source').onclick=sourceExample;
 function edit(index){
  const {choices,result}=getState();let draft=structuredClone(choices),group='all';
  open('Изменить решение '+(index+1)+' из 5');
  body.innerHTML='<p class="dialog-intro">Выберите проект и район. Сначала сравните эффект — ваш план изменится только после подтверждения.</p><nav id="categories" class="category-tabs" aria-label="Направление проекта"></nav><div class="editor-grid"><div id="project-list" class="project-list"></div><section id="project-preview" class="project-preview"></section></div>';
  const categories=$('categories');
  for(const [id,name] of [['all','Все'],...Object.entries(groups)]){
   const b=document.createElement('button');b.textContent=name;b.className=id===group?'active':'';b.onclick=()=>{group=id;for(const child of categories.children)child.classList.toggle('active',child===b);list();};categories.append(b);
  }
  function list(){
   $('project-list').replaceChildren(...measures.filter(m=>group==='all'||m.group===group).map(m=>{
    const used=choices.some((c,i)=>i!==index&&c.id===m.id),b=document.createElement('button');
    b.className='project-option'+(draft[index].id===m.id?' selected':'');b.disabled=used;
    b.setAttribute('aria-pressed',String(draft[index].id===m.id));
    b.innerHTML='<span><strong>'+titles[m.id]+'</strong><small>'+groups[m.group]+(used?' · уже в плане':'')+'</small></span><b>'+m.cost+' ед.</b>';
    b.onclick=()=>{draft[index]=m.type==='city'?{id:m.id}:{id:m.id,district:draft[index].district??(districts.some(d=>d.name===getState().selected)?getState().selected:'Нура')};list();preview();};return b;
   }));
  }
  function preview(){
   const m=measures.find(m=>m.id===draft[index].id),errors=validate(draft),candidate=errors.length?null:evaluate(draft);
   $('project-preview').innerHTML='<span class="eyebrow">'+esc(groups[m.group])+'</span><h3>'+esc(m.name)+'</h3>'+
    (m.type==='district'?'<label class="field-label" for="target-district">Где реализовать</label><select id="target-district">'+districts.map(d=>'<option'+(d.name===draft[index].district?' selected':'')+'>'+d.name+'</option>').join('')+'</select>':'<p class="scope-note">Действует во всех пяти районах</p>')+
    '<div class="effect-list"><span class="eyebrow">ЭФФЕКТ ПРОЕКТА ЧЕРЕЗ 2 ГОДА</span>'+Object.entries(m.effects).map(([key,value])=>'<p><span>'+indicators.find(x=>x.id===key).name+'</span><strong class="'+(value<0?'negative':'')+'">'+sign(value*(8-m.lag)/8)+'</strong></p>').join('')+'<small>Баллы показателей с учётом задержки '+m.lag+' кв. Дополнительный эффект совместных проектов учтён в итоге плана.</small></div>'+
    '<div class="preview-summary"><div><span>Бюджет всего плана</span><strong>'+draft.reduce((sum,c)=>sum+measures.find(m=>m.id===c.id).cost,0)+' / 100</strong></div>'+
    (candidate?'<div><span>Индекс: план → замена</span><strong>'+fmt(result.score)+' → '+fmt(candidate.score)+'</strong></div><div><span>Критические: план → замена</span><strong>'+result.critical+' → '+candidate.critical+'</strong></div>':'')+'</div>'+
    '<p id="action-error" class="error-text" role="alert">'+errors.map(x=>esc(humanError(x))).join(' ')+'</p><button id="save-project" class="primary"'+(errors.length?' disabled':'')+'>Применить решение</button>';
   if($('target-district'))$('target-district').onchange=e=>{draft[index].district=e.target.value;preview();};
   $('save-project').onclick=e=>accept(draft,e.currentTarget);
  }
  list();preview();
 }
 function metricTable(){
  const {baseline,result,selected}=getState();
  const d=result.districts.find(d=>d.name===selected),b=baseline.districts.find(d=>d.name===selected);
  open('Показатели · '+selected);
  if(!d){body.innerHTML='<p class="dialog-intro">В датасете организаторов нет показателей Сарайшыка. Район показан только на карте и не участвует в расчёте.</p>';return;}
  body.innerHTML='<p class="dialog-intro">Сейчас → через 2 года. Все значения — баллы учебной модели от 0 до 100; ниже 40 — критический уровень.</p><div class="metric-table">'+indicators.map(m=>'<div><span>'+m.name+'<small>'+esc(m.meaning)+'</small></span><b>'+fmt(b.values[m.id])+' → '+fmt(d.values[m.id])+'</b><strong class="'+(d.values[m.id]<b.values[m.id]?'negative':'')+'">'+sign(d.values[m.id]-b.values[m.id])+'</strong></div>').join('')+'</div>';
 }
 function planDescription(choices){return choices.map(c=>'<li>'+titles[c.id]+' <small>· '+(c.district??'Весь город')+'</small></li>').join('');}
 function summaryRows(left,right){return [['Индекс города',left.score,right.score],['Расход из 100',left.cost,right.cost],['Критических показателей',left.critical,right.critical],['Слабейший район',left.minimum,right.minimum]].map(([name,a,b])=>'<div><span>'+name+'</span><b>'+fmt(a)+' → '+fmt(b)+'</b><strong>'+sign(b-a)+'</strong></div>').join('');}
 function comparison(){
  const {choices,result}=getState();open('Сравнение гипотез');
  body.innerHTML='<p class="dialog-intro">Сохраните текущую гипотезу, затем измените проекты. Здесь можно сравнить оба плана и вернуться к сохранённому.</p><div class="comparison-grid"><section><span class="eyebrow">СОХРАНЁННАЯ ГИПОТЕЗА</span><h3>'+(saved?fmt(evaluate(saved).score)+' балла':'Пока не сохранена')+'</h3><ul class="plan-description">'+(saved?planDescription(saved):'<li>Сохраните первый вариант для сравнения.</li>')+'</ul></section><section><span class="eyebrow">ТЕКУЩИЙ ПЛАН</span><h3>'+fmt(result.score)+' балла</h3><ul class="plan-description">'+planDescription(choices)+'</ul></section></div>'+
   (saved?'<div class="metric-table">'+summaryRows(evaluate(saved),result)+'</div>':'')+
   '<div class="dialog-actions"><button class="primary" id="save-hypothesis">'+(saved?'Обновить сохранённую гипотезу':'Сохранить гипотезу')+'</button>'+(saved?'<button class="secondary" id="restore-hypothesis">Вернуться к сохранённой</button>':'')+'</div><p id="action-error" class="error-text" role="alert"></p>';
  $('save-hypothesis').onclick=()=>{saved=structuredClone(choices);try{localStorage.setItem('samga-city-saved',JSON.stringify(saved));}catch{notify('Гипотеза сохранена только на время этой сессии.');}comparison();};
  if(saved)$('restore-hypothesis').onclick=e=>accept(saved,e.currentTarget);
 }
 function strategies(){
  open('Какую задачу решаем?');
  body.innerHTML='<p class="dialog-intro">Поиск перебирает допустимые планы по модели задания. Результат сначала можно изучить и сравнить со своим.</p><div class="goal-options">'+[['score','Повысить качество жизни','Максимальный общий индекс'],['weakest','Поддержать слабейший район','Максимальный минимальный районный балл'],['cost','Устранить критические проблемы','Минимальные затраты при отсутствии показателей ниже 40'],['air','Улучшить качество воздуха','Максимальный взвешенный показатель воздуха']].map(([id,title,note])=>'<button class="goal-option" data-goal="'+id+'"><strong>'+title+'</strong><small>'+note+'</small><span>↗</span></button>').join('')+'</div><p id="search-status" role="status" class="dialog-intro">'+(online?'':'Запустите node backend/server.mjs, чтобы включить полный поиск.')+'</p><div id="search-result"></div>';
  for(const button of body.querySelectorAll('[data-goal]')){button.disabled=!online;button.onclick=async()=>{
   const token=view;for(const b of body.querySelectorAll('[data-goal]'))b.disabled=true;
   $('search-result').replaceChildren();$('search-status').textContent='Сравниваем допустимые планы…';
   try{
    const found=await api('search',{objective:button.dataset.goal,maxBudget:100,criticalLimit:button.dataset.goal==='cost'?0:null});
    if(token!==view)return;
    if(!found.scenario){$('search-status').textContent='Допустимый план не найден.';return;}
    const {result}=getState(),next=found.scenario;
    $('search-status').textContent='Проверено '+fmt(found.validCount)+' допустимых планов. Это оптимум только внутри учебной модели.';
    $('search-result').innerHTML='<div class="metric-table">'+summaryRows(result,next.result)+'</div><ul class="plan-description">'+planDescription(next.choices)+'</ul><p class="dialog-intro">Правило DOCX: пять разных мер, не более двух одного направления. Покрытие всех пяти направлений этим поиском не гарантируется.</p><button id="use-suggestion" class="primary">Применить этот план</button><p id="action-error" class="error-text" role="alert"></p>';
    $('use-suggestion').onclick=e=>accept(next.choices,e.currentTarget);
   }catch(error){if(token===view)$('search-status').textContent=error.message;}
   finally{if(token===view)for(const b of body.querySelectorAll('[data-goal]'))b.disabled=false;}
  };}
 }

 function factsHtml(a){return '<p class="analysis-summary">'+esc(a.summary.replace('Score:','Индекс города:'))+'</p>'+[['Что улучшится',a.strengths],['Риски и ограничения',a.risks],['Следующий шаг',a.recommendations]].map(([title,items])=>'<section class="analysis-section"><h3>'+title+'</h3><ul>'+items.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ul></section>').join('');}
 function evidenceHtml(e){return '<p class="dialog-intro">'+esc(e.notice)+'</p>'+e.cards.map(c=>'<article class="source-card"><small>'+esc(c.publisher)+'</small><h3><a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.title)+' ↗</a></h3><p>'+esc(c.summary)+'</p><p class="source-limit">'+esc(c.limit)+'</p></article>').join('')+(e.gaps.length?'<p class="dialog-intro">Источники ещё не подобраны для: '+e.gaps.map(id=>titles[id]).join(', ')+'.</p>':'');}
 async function insights(){
  const token=open('Почему город изменится');
  const {choices,result,baseline}=getState();
  body.innerHTML='<div class="insight-tabs"><button id="facts-tab" class="active">Разбор плана</button><button id="evidence-tab">Мировой опыт</button><button id="assistant-tab">ИИ-помощник</button></div><div id="insight-content" aria-live="polite"></div>';
  let tabVersion=0;
  const target=$('insight-content');
  async function tab(name){
   const request=++tabVersion;
   for(const id of ['facts','evidence','assistant'])$(id+'-tab').classList.toggle('active',id===name);
   target.innerHTML='<p class="dialog-intro">Загружаем…</p>';
   try{
    if(name==='facts'){
     if(online){const data=await api('facts',{choices});if(token!==view||request!==tabVersion)return;target.innerHTML=factsHtml(data.analysis);}
     else target.innerHTML='<p class="analysis-summary">Индекс: '+fmt(baseline.score)+' → '+fmt(result.score)+'. Расход: '+result.cost+' из 100. Критических показателей: '+result.critical+'.</p><p class="dialog-intro">Для подробного разбора запустите node backend/server.mjs.</p>';
     target.insertAdjacentHTML('beforeend','<details class="method"><summary>Как это рассчитано</summary><p>Индекс = 70% среднего по населению + 30% балла слабейшего района − количество показателей ниже 40. Эффекты учитывают задержку внедрения и совместное действие проектов.</p><p>Источник коэффициентов — DOCX организаторов. Горизонт: 8 кварталов. Данные учебные; расчёт не является прогнозом реальной Астаны. На 1, 5 и 10 лет модель не калибрована.</p></details>');
    }else if(name==='evidence'){
     if(!online){target.innerHTML='<p class="dialog-intro">Источники доступны при запуске полного симулятора: node backend/server.mjs.</p>';return;}
     const evidence=await api('evidence',{measureIds:choices.map(c=>c.id)});if(token!==view||request!==tabVersion)return;target.innerHTML=evidenceHtml(evidence);
    }else{
     target.innerHTML='<p class="dialog-intro">'+(aiReady?'Задайте цель. Помощник обратится к расчёту и покажет последствия перед применением.':'Живой ИИ подключим после добавления ключа команды. Расчёт, разбор плана и поиск стратегий уже работают без него.')+'</p><form id="assistant-form"><label for="assistant-question" class="field-label">Что хотите проверить?</label><textarea id="assistant-question" maxlength="2000" rows="3" placeholder="Сохрани школу в Нуре и найди план дешевле"'+(aiReady?'':' disabled')+'></textarea><button class="primary"'+(aiReady?'':' disabled')+'>Проверить гипотезу</button></form><div id="assistant-answer" aria-live="polite"></div>';
     $('assistant-form').onsubmit=async event=>{
      event.preventDefault();const b=event.currentTarget.querySelector('button'),answer=$('assistant-answer');b.disabled=true;answer.textContent='Проверяем гипотезу…';
      try{
       const data=await api('assistant',{question:$('assistant-question').value,choices,...(saved?{comparisonChoices:saved}:{})});
       if(token!==view||request!==tabVersion)return;
       answer.innerHTML=data.analysis?factsHtml(data.analysis):data.evidence?evidenceHtml(data.evidence):'<p class="dialog-intro">'+esc(data.message??'Сравнение готово.')+'</p>';
       if(data.comparison)answer.insertAdjacentHTML('beforeend','<div class="metric-table">'+summaryRows(data.comparison.left.result,data.comparison.right.result)+'</div>');
       if(data.search?.scenario){
        const proposal=data.search.scenario,limits=data.interpretation;
        const required=limits.required.map(c=>titles[c.id]+(c.district?' · '+c.district:'')).join('; ')||'нет';
        answer.insertAdjacentHTML('beforeend','<p class="dialog-intro">Условия, которые понял помощник: цель — '+esc(({score:'общий индекс',cost:'минимальный расход',weakest:'слабейший район',air:'качество воздуха'})[limits.objective])+'; бюджет до '+limits.maxBudget+'; обязательные проекты: '+esc(required)+'; исключены: '+esc(limits.excluded.map(id=>titles[id]).join(', ')||'нет')+'; лимит критических показателей: '+(limits.criticalLimit??'не задан')+'.</p><ul class="plan-description">'+planDescription(proposal.choices)+'</ul><button class="primary" id="use-assistant-plan">Применить предложенный план</button><p id="action-error" class="error-text"></p>');
        $('use-assistant-plan').onclick=e=>accept(proposal.choices,e.currentTarget);
       }
      }catch(error){if(token===view&&request===tabVersion)answer.textContent=error.message;}
      finally{b.disabled=false;}
     };
    }
   }catch(error){if(token===view&&request===tabVersion)target.textContent=error.message;}
  }
  for(const name of ['facts','evidence','assistant'])$(name+'-tab').onclick=()=>tab(name);
  tab('facts');
 }
 $('all-metrics').onclick=metricTable;$('compare').onclick=comparison;$('strategy').onclick=strategies;$('insights').onclick=insights;
 return {renderPlan};
}
