import {baseline,presets,analyse,districts,indicators,measures} from './comparison.mjs';
import {createComparisonMap} from './map.mjs';
import {icon} from './shell.mjs';
import {inspectDraft,proposeChoice,buildDistrictMatrix} from './planner.mjs';
import {createCatalog} from './catalog-ui.mjs';

const $=id=>document.getElementById(id);
const fmt=(n,d=2)=>n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const exact=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const catalog=new Map(measures.map(m=>[m.id,m]));
const reports=new Map(presets.map(p=>[p.id,analyse(p.choices)]));
for(const [id,r] of reports)if(!r.ok)throw new Error('Невалидный пример '+id+': '+r.errors.join('; '));
const weak=reports.get('capital').result,better=reports.get('source').result,economy=reports.get('cheap').result;
const stages=[
 {id:null,name:'Исходная ситуация'},
 {id:'capital',name:'Неудачный приоритет'},
 {id:'source',name:'Перераспределение'},
 {id:'cheap',name:'Экономный вариант'},
 {id:'source',name:'Итог сравнения'}
];
const names={M1:'Автобусные полосы',M2:'Умные светофоры',M3:'ЛРТ / расширение',M6:'Городское озеленение',M13:'Модернизация сетей',M14:'Аварийные бригады',M7:'Школа и детсад',M8:'Поликлиника',M10:'Освещение и камеры',M12:'Платформа обращений',M5:'Чистое топливо',M9:'Дворовые спорт-хабы',M11:'Безопасные переходы',M4:'Парк / сквер'};
const labels={S1:'Школы и детсады',S2:'Медицина',T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',B1:'Безопасность улиц',B2:'Безопасность дорог',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
let stage=0,activeId=null,choices=[],analysis=null,selected='Нура',before=true,custom=false,playing=false,timer=null,cityMap=null;
let compared=['Нура','Есиль'],savedDraft=null,feedback='';
const hasPlan=()=>custom||activeId!==null;
const current=()=>before||!hasPlan()?baseline:analysis?.ok?analysis.result:null;
const value=(r,d,k)=>r.districts.find(x=>x.name===d).values[k];
function stop(){playing=false;clearTimeout(timer);timer=null;}
function chooseStage(index){
 stage=index;activeId=stages[index].id;custom=false;before=!activeId;selected='Нура';
 choices=activeId?presets.find(p=>p.id===activeId).choices.map(c=>({...c})):[];
 analysis=activeId?analyse(choices):null;feedback='';
 if(!compared.includes(selected))compared.unshift(selected);
 render();cityMap?.setView(activeId?'districts':'city');
 if(index===0)window.scrollTo({top:0,behavior:'instant'});
}
function choosePreset(id){chooseStage(stages.findIndex(s=>s.id===id));}
function setDraft(next,district=selected,message=''){
 stop();choices=next.map(c=>({...c}));analysis=analyse(choices);custom=true;activeId=null;
 selected=district;before=!analysis.ok;savedDraft=choices.map(c=>({...c}));feedback=message;
 if(!compared.includes(selected))compared.unshift(selected);
 render();cityMap?.setView('districts');
}
function focusDistrict(name){
 stop();selected=name;if(!compared.includes(name))compared.push(name);render();cityMap?.setView('districts');
}
function openCatalog(options={}){
 stop();renderControls();measurePicker.open(options);
}

function narrative(){
 if(before&&hasPlan()&&analysis?.ok)return {title:'Исходные показатели выбранного плана',copy:'Показатели показаны до решений. Бюджет и список проектов относятся к выбранному плану.',facts:[{text:'До изменений у Нуры <strong>'+exact(value(baseline,'Нура','S1'))+'</strong> по школам и <strong>'+exact(value(baseline,'Нура','S2'))+'</strong> по медицине.',risk:true},{text:'Вернитесь к результату, чтобы сравнить эффект выбранных проектов.'}],action:'Показать результат плана'};

 if(custom){
  const state=inspectDraft(choices),missing=5-choices.length;
  if(!state.canCalculate)return {title:'Свой план · '+choices.length+' из 5 решений',copy:state.errors.length?state.errors.join(' '):'Добавьте ещё '+missing+'. В резерве '+state.remaining+' единиц. Итог будет рассчитан для полного плана.',facts:[{text:'<strong>'+choices.length+' из 5 решений</strong>. Пока показываем исходные показатели районов.'},{text:state.errors.length?state.errors[0]:'Нельзя повторять меры, превышать бюджет или выбирать больше двух из одного направления.',risk:state.errors.length>0}],action:'Добавить решение'};
  return {title:'Свой план · готов к расчёту',copy:'Пять допустимых решений. Сверьте последствия по всем показателям выбранных районов.',facts:[{text:'Индекс <strong>'+fmt(analysis.result.score)+'</strong>, расходы <strong>'+state.cost+'</strong> из 100.'},{text:'Критических показателей: <strong>'+analysis.result.critical+'</strong>. '+(analysis.result.critical?'Проверьте оставшиеся проблемы и подберите замену.':'Отсутствие критических провалов не означает, что все задачи решены.'),risk:analysis.result.critical>0}],action:analysis.result.critical?'Подобрать улучшение':'Сравнить варианты'};
 }
 if(stage===0)return {title:'Исходная ситуация',copy:'Нура: школы '+exact(value(baseline,'Нура','S1'))+', медицина '+exact(value(baseline,'Нура','S2'))+'. Бюджет — 100 единиц, решений должно быть пять.',facts:[{text:'<strong>Школы и медицина Нуры</strong> находятся ниже критической отметки 40.',risk:true},{text:'Сравним, как разные планы изменят город при одном и том же бюджете.'}],action:'Показать неудачный план'};
 if(stage===1)return {title:'Неудачный приоритет',copy:'Все районные проекты направлены в Есиль. Потрачено 95, две критические проблемы Нуры остались.',facts:[{text:'У Нуры по-прежнему <strong>'+exact(value(weak,'Нура','S1'))+'</strong> по школам и <strong>'+exact(value(weak,'Нура','S2'))+'</strong> по медицине.',risk:true},{text:'Те же меры можно перенести в слабые районы, сохранив расходы <strong>'+weak.cost+'</strong>.'}],action:'Перераспределить помощь'};
 if(stage===2)return {title:'Перераспределение',copy:'Школа, поликлиника и освещение — в Нуру; чистое топливо — в Сарыарку. Расходы остались 95.',facts:[{text:'<strong>Оба критических провала устранены.</strong> Школы Нуры '+exact(value(better,'Нура','S1'))+', медицина '+exact(value(better,'Нура','S2'))+'.'},{text:'Транспорт Нуры остаётся на <strong>'+exact(value(better,'Нура','T2'))+'</strong>. Этот план не решает все проблемы.'}],action:'Проверить вариант дешевле'};
 if(stage===3)return {title:'Экономный вариант',copy:'Расходы — '+economy.cost+', резерв — '+(100-economy.cost)+'. Медицина Нуры всё ещё ниже 40, разгрузка дорог ухудшилась.',facts:[{text:'В резерве <strong>'+(100-economy.cost)+'</strong> единиц. Но медицина Нуры — <strong>'+exact(value(economy,'Нура','S2'))+'</strong>.',risk:true},{text:'Безопасные переходы улучшают безопасность, но снижают разгрузку дорог: <strong>'+exact(value(baseline,'Нура','T1'))+' → '+exact(value(economy,'Нура','T1'))+'</strong>.',risk:true}],action:'Сравнить итог'};
 return {title:'Итог сравнения',copy:'Распределение помощи по потребностям даёт лучший индекс среди трёх показанных вариантов.',facts:[{text:'При тех же расходах <strong>'+better.cost+'</strong> итог выше на <strong>'+fmt(better.score-weak.score)+'</strong> балла.'},{text:'Это лучший из трёх примеров. Экономный вариант дешевле, но сохраняет проблему медицины.'}],action:'Начать заново'};
}
function renderControls(){
 const options=[{id:'',title:'Исходный город'},...presets,...(savedDraft!==null?[{id:'custom',title:'Мой план ('+savedDraft.length+'/5)'}]:[])];
 $('scenario-select').innerHTML=options.map(p=>'<option value="'+p.id+'"'+((custom?p.id==='custom':(activeId??'')===p.id)?' selected':'')+'>'+p.title+'</option>').join('');
 $('demo-stages').innerHTML=stages.map((s,i)=>'<button class="demo-stage'+(!custom&&stage===i?' active':'')+(!custom&&stage>i?' done':'')+'" data-stage="'+i+'"'+(!custom&&stage===i?' aria-current="step"':'')+'><span class="stage-dot">'+(i+1)+'</span><span>'+s.name+'</span></button>').join('');
 for(const b of $('demo-stages').querySelectorAll('button'))b.onclick=()=>{stop();chooseStage(Number(b.dataset.stage));};
 $('play-label').textContent=playing?'Пауза':'Демонстрация';$('play-demo').classList.toggle('playing',playing);
 $('play-demo').querySelector('i').innerHTML=icon(playing?'pause':'play');
 $('play-status').textContent=playing?'Автопоказ':custom?'Мой план':stage===4?'Показ завершён':'Ручной режим';
 const n=narrative();$('stage-number').textContent=custom?choices.length+'/5':String(stage+1).padStart(2,'0');$('stage-title').textContent=n.title;$('stage-copy').textContent=n.copy;
 $('next-step').innerHTML=(custom?(analysis?.ok?'Показать результат':'Добавить решение'):stage===4?'Сначала':'Следующий шаг')+'<i>'+icon('next')+'</i>';
}
function renderMetrics(){
 const data=current(),state=inspectDraft(choices),pending=hasPlan()&&!analysis?.ok;
 $('budget-used').textContent=state.cost;$('budget-free').textContent=state.remaining+' в резерве';$('budget-fill').style.width=Math.min(100,state.cost)+'%';
 $('budget-status').textContent=hasPlan()?'План':'Доступно';
 $('decision-count').textContent=choices.length+' из 5 решений'+(choices.length?' · направлений: '+Object.keys(state.directions).length:'');
 const scoreData=pending?null:data;
 $('score-value').textContent=scoreData?fmt(scoreData.score):'—';$('score-base').textContent=fmt(baseline.score);
 const delta=scoreData?scoreData.score-baseline.score:0;
 $('score-delta').textContent=pending?(state.errors.length?'Исправьте план':'Нужно ещё '+(5-choices.length)):delta===0?'Исходный':(delta>0?'+':'')+fmt(delta);
 $('score-delta').className='score-delta '+(delta>=0?'positive':'negative');$('score-horizon').textContent=pending?'Итог пока недоступен':before?'Сейчас':'Через 2 года';
 $('critical-value').textContent=data?data.critical:'—';
 const critical=data?data.districts.flatMap(d=>d.critical.map(key=>({district:d.name,key}))):[];
 $('critical-summary').textContent=!data?'План невалиден':pending?'Исходные данные':critical.length?[...new Set(critical.map(c=>c.district))].join(', '):'показателей ниже 40';
 $('critical-tags').innerHTML=!data?'':critical.length?critical.map(c=>'<button class="critical-tag" data-need="'+c.key+'" data-district="'+c.district+'" aria-label="Подобрать меры: '+labels[c.key]+', '+c.district+'">'+labels[c.key]+'</button>').join(''):'<span class="critical-tag good">Критических провалов нет</span>';
 for(const b of $('critical-tags').querySelectorAll('button'))b.onclick=()=>{focusDistrict(b.dataset.district);openCatalog({indicator:b.dataset.need});};
}
function renderDecisions(){
 $('plan-status').textContent=choices.length+' / 5';$('add-measure').disabled=choices.length>=5;
 const rows=choices.map((c,i)=>{
  const m=catalog.get(c.id);
  const targets=m.type==='district'?'<select data-project="'+m.id+'" data-index="'+i+'" aria-label="Район: '+names[c.id]+'">'+districts.map(d=>{
   const p=proposeChoice(choices,c.id,d.name,i);
   return '<option value="'+d.name+'"'+(d.name===c.district?' selected':'')+(!p.allowed?' disabled':'')+'>'+d.name+(!p.allowed?' — конфликт':'')+'</option>';
  }).join('')+'</select>':'<span>Весь город</span>';
  return '<div class="decision-row"><span class="decision-index">'+(i+1)+'</span><div class="decision-body"><button class="edit-measure" data-edit="'+i+'" aria-label="Заменить: '+names[c.id]+'">'+names[c.id]+'</button>'+targets+'</div><span class="decision-cost">'+m.cost+'<small>ед.</small></span><button class="remove-measure" data-remove="'+i+'" aria-label="Убрать: '+names[c.id]+'">×</button></div>';
 });
 for(let i=choices.length;i<5;i++)rows.push('<button class="decision-placeholder add-slot" data-slot="'+i+'"><span class="decision-index">'+(i+1)+'</span><span>Выбрать мероприятие</span><b>+</b></button>');
 $('decisions').innerHTML=rows.join('');
 for(const b of $('decisions').querySelectorAll('[data-edit]'))b.onclick=()=>openCatalog({replaceIndex:Number(b.dataset.edit)});
 for(const b of $('decisions').querySelectorAll('[data-slot]'))b.onclick=()=>openCatalog();
 for(const b of $('decisions').querySelectorAll('[data-remove]'))b.onclick=()=>setDraft(choices.filter((_,i)=>i!==Number(b.dataset.remove)),selected,'Решение удалено. Добавьте замену для расчёта.');
 for(const select of $('decisions').querySelectorAll('select'))select.onchange=()=>{
  const p=proposeChoice(choices,select.dataset.project,select.value,Number(select.dataset.index));
  if(!p.allowed){feedback='Район не изменён: '+p.errors.join(' ');renderDecisions();return;}
  const id=select.dataset.project;setDraft(p.choices,select.value,'Район проекта изменён.');
  $('decisions').querySelector('[data-project="'+id+'"]').focus();
 };
 const state=inspectDraft(choices);
 const errorText=state.errors.length?state.errors.join(' '):feedback.startsWith('Район не изменён')?feedback:'';
 $('plan-note').textContent=feedback&&!errorText?feedback:state.canCalculate?'План допустим. Нажмите название меры для замены.':'Выбрано '+choices.length+'/5 · '+state.remaining+' ед. доступны';
 $('restore-plan').hidden=!choices.length;$('restore-plan').textContent='Очистить';
 $('validation').hidden=!errorText;
 $('validation').textContent=errorText;
}
function renderDistricts(){
 const data=current();$('show-before').setAttribute('aria-pressed',String(before));$('show-after').setAttribute('aria-pressed',String(!before));$('show-after').disabled=!analysis?.ok;
 $('district-selection').innerHTML=districts.map(d=>'<button data-compare="'+d.name+'" aria-pressed="'+compared.includes(d.name)+'">'+(compared.includes(d.name)?'<span>✓</span>':'<span>+</span>')+d.name+'</button>').join('');
 for(const b of $('district-selection').querySelectorAll('button'))b.onclick=()=>{
  stop();const name=b.dataset.compare;
  if(compared.includes(name)){if(compared.length===1)return;compared=compared.filter(d=>d!==name);if(selected===name)selected=compared[0];}
  else{compared.push(name);selected=name;}
  render();$('district-selection').querySelector('[data-compare="'+name+'"]').focus();
 };
 $('district-caption').textContent=(before?'Исходные показатели':'Через 2 года')+' · все 10 показателей · выше = лучше';
 if(!data){$('district-matrix').innerHTML='<tbody><tr><td>Исправьте план, чтобы увидеть прогноз.</td></tr></tbody>';return;}
 const matrix=buildDistrictMatrix(compared,data);
 const head='<thead><tr><th>Показатель</th>'+matrix.districts.map(d=>'<th class="'+(d.name===selected?'focused':'')+'"><button data-focus="'+d.name+'">'+d.name+'</button><small>'+Math.round(d.populationShare*100)+'% населения</small><span>Индекс '+fmt(d.scoreAfter,1)+'</span></th>').join('')+'</tr></thead>';
 const body=matrix.rows.map(row=>'<tr class="'+(row.id.endsWith('1')?'group-start':'')+'"><th><span class="indicator-code">'+row.id+'</span>'+labels[row.id]+'</th>'+row.values.map(c=>'<td title="'+(before?'Исходное значение '+exact(c.before):'Было '+exact(c.before)+', стало '+exact(c.after)+', изменение '+exact(c.delta))+'" class="'+(c.critical?'critical-cell':c.delta<0?'loss-cell':c.delta>0?'gain-cell':'')+'">'+(!before&&c.delta!==0?'<span class="matrix-before">'+exact(c.before)+' → </span>':'')+'<strong>'+exact(c.after)+'</strong>'+(c.critical?'<span class="critical-sign" title="Ниже 40">!</span>':'')+'</td>').join('')+'</tr>').join('');
 $('district-matrix').innerHTML=head+'<tbody>'+body+'</tbody>';
 for(const b of $('district-matrix').querySelectorAll('[data-focus]'))b.onclick=()=>{const name=b.dataset.focus;focusDistrict(name);$('district-matrix').querySelector('[data-focus="'+name+'"]').focus();};
}
function renderReview(){
 const data=current()??baseline,d=data.districts.find(d=>d.name===selected);
 const lowest=Object.entries(d.values).sort((a,b)=>a[1]-b[1]).slice(0,3);
 $('review-status').textContent=selected;$('needs-title').textContent=selected+' · наименьшие показатели';
 $('needs-list').innerHTML=lowest.map(([key,n])=>'<div class="need-row"><div><span>'+labels[key]+'</span><strong class="'+(n<40?'risk':'')+'">'+exact(n)+'</strong></div><button data-priority="'+key+'" aria-label="Подобрать меры для показателя '+labels[key]+'">Подобрать меры</button></div>').join('');
 for(const b of $('needs-list').querySelectorAll('button'))b.onclick=()=>openCatalog({indicator:b.dataset.priority});
 const state=inspectDraft(choices),directions={T:'Транспорт',E:'Экология',S:'Соцсфера',B:'Безопасность',C:'Сервисы'};
 $('plan-checks').innerHTML='<div class="checks-heading"><strong>Правила плана</strong><span>'+choices.length+'/5 решений · '+state.cost+'/100 ед.</span></div><div class="direction-counts">'+Object.entries(directions).map(([id,title])=>'<span title="'+title+'">'+title+' <b>'+(state.directions[id]??0)+'/2</b></span>').join('')+'</div>';
 const n=narrative();$('review-facts').innerHTML=n.facts.map(f=>'<div class="review-fact'+(f.risk?' risk':'')+'"><i>'+icon(f.risk?'warning':'check')+'</i><div>'+f.text+'</div></div>').join('');
 $('recommendation').innerHTML=n.action+'<i>'+icon('arrow')+'</i>';
}
function renderComparison(){
 const tradeoffs={capital:'Школы и медицина Нуры без улучшений',source:'Транспорт Нуры остаётся на 40',cheap:'Медицина ниже 40; дороги ухудшились'};
 $('comparison-rows').innerHTML=presets.map(p=>{
  const r=reports.get(p.id).result,selectedPlan=activeId===p.id&&!custom;
  return '<tr class="'+(selectedPlan?'selected':'')+'"><td>'+p.title+'</td><td>'+r.cost+' / 100</td><td class="score-cell">'+fmt(r.score)+'</td><td class="'+(r.critical?'risk-label':'good-label')+'">'+r.critical+'</td><td>'+tradeoffs[p.id]+'</td><td><button data-preset="'+p.id+'" aria-label="Выбрать вариант '+p.title+'">'+(selectedPlan?'Выбран':'Выбрать')+'</button></td></tr>';
 }).join('');
 if(savedDraft!==null){
  const mine=analyse(savedDraft),state=inspectDraft(savedDraft);
  $('comparison-rows').insertAdjacentHTML('beforeend','<tr class="'+(custom?'selected':'')+'"><td>Мой план'+(!mine.ok?' <span class="custom-label">'+savedDraft.length+'/5</span>':'')+'</td><td>'+state.cost+' / 100</td><td class="score-cell">'+(mine.ok?fmt(mine.result.score):'—')+'</td><td>'+(mine.ok?mine.result.critical:'—')+'</td><td>'+(mine.ok?(mine.result.critical?'Остались критические показатели':'Нет показателей ниже 40'):'Завершите пять допустимых решений')+'</td><td><button data-preset="custom" aria-label="Вернуться к моему плану">'+(custom?'Выбран':'Вернуться')+'</button></td></tr>');
 }
 for(const b of $('comparison-rows').querySelectorAll('button'))b.onclick=()=>{stop();if(b.dataset.preset==='custom')setDraft(savedDraft,selected);else choosePreset(b.dataset.preset);};
 $('comparison-foot').textContent=savedDraft!==null?'«Мой план» сохраняется в этой открытой странице при переходе к примерам. После перезагрузки начинается новая сессия.':'Первые два плана содержат одинаковые меры. Меняются только районы. Примеры можно менять и сравнивать со своим планом.';
}
function renderMap(){
 const data=current(),pending=hasPlan()&&!analysis?.ok;
 $('map-indication').textContent=pending?'Черновик '+choices.length+'/5 · показатели исходные':!data?'Расчёт недоступен':before?'Исходное состояние':custom?'Мой план · через 2 года':'После решений · через 2 года';
 const local=choices.filter(c=>c.district===selected).length;
 $('map-foot').textContent=selected+': проектов в плане — '+local+'. Выберите район на карте для сравнения и подбора мер.';
 cityMap?.present({data:data??baseline,choices,selected,scenarioId:activeId,before:before||!data,custom});
}
function render(){renderControls();renderMetrics();renderDecisions();renderDistricts();renderReview();renderComparison();renderMap();}
function advance(){
 if(custom){if(analysis?.ok){before=false;render();$('district-widget').scrollIntoView({block:'nearest',behavior:'smooth'});}else openCatalog();return;}
 if(before&&activeId){before=false;render();return;}
 chooseStage(stage===4?0:stage+1);
 if(stage===4)$('compare-widget').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'end'});
 if(stage===0)window.scrollTo({top:0,behavior:'instant'});
}
function schedule(){
 clearTimeout(timer);if(!playing)return;
 timer=setTimeout(()=>{if(stage===4){stop();render();return;}advance();if(stage===4){stop();render();}else schedule();},10000);
}
$('scenario-select').onchange=event=>{stop();if(event.target.value==='custom'){setDraft(savedDraft,selected);return;}choosePreset(event.target.value||null);};
$('next-step').onclick=()=>{stop();advance();};
$('recommendation').onclick=()=>{
 stop();
 if(before&&analysis?.ok){before=false;render();return;}
 if(!custom){advance();return;}
 if(!analysis?.ok){openCatalog();return;}
 if(analysis.result.critical){const d=analysis.result.districts.find(d=>d.critical.length);focusDistrict(d.name);openCatalog({indicator:d.critical[0]});return;}
 $('compare-widget').scrollIntoView({block:'end',behavior:'smooth'});
};
$('restore-plan').onclick=()=>setDraft([],selected,'План очищен. Можно выбрать новые решения.');
$('new-plan').onclick=()=>{setDraft([],selected);openCatalog();};
$('add-measure').onclick=()=>openCatalog();
$('all-districts').onclick=()=>{stop();compared=districts.map(d=>d.name);render();};
$('show-before').onclick=()=>{stop();before=true;render();};$('show-after').onclick=()=>{stop();before=false;render();};
$('play-demo').onclick=()=>{if(playing){stop();render();return;}if(custom||stage===4)chooseStage(0);window.scrollTo({top:0,behavior:'instant'});playing=true;render();schedule();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
const measurePicker=createCatalog({getChoices:()=>choices,getSelectedDistrict:()=>selected,onApply:(next,info)=>{
 setDraft(next,info.district??selected,'Решение '+(info.index+1)+(info.replaced?' заменено.':' добавлено в план.'));
 $('decisions').querySelector('[data-edit="'+info.index+'"]').focus();
}});
// Контекст и действия для отдельного ассистента. Данные плана копируются.
window.akimAssistant={
 getContext:()=>({choices:choices.map(c=>({...c})),selectedDistrict:selected,activePreset:activeId}),
 onAction(action){
  if(!action||typeof action.type!=='string')return;
  if(action.type==='focus_comparison'){stop();render();$('compare-widget').scrollIntoView({behavior:'smooth',block:'center'});}
  if(action.type==='focus_district'&&districts.some(d=>d.name===action.district)){focusDistrict(action.district);$('district-widget').scrollIntoView({behavior:'smooth',block:'center'});}
  if(action.type==='select_preset'&&presets.some(p=>p.id===action.preset)){stop();choosePreset(action.preset);}
 }
};
render();
createComparisonMap({onSelect:focusDistrict,onStatus:(message,error=false)=>{$('map-status').textContent=message;$('map-status').hidden=!message;$('map-status').classList.toggle('error',error);}}).then(controller=>{cityMap=controller;renderMap();cityMap.setView(hasPlan()?'districts':'city');});
if(new URLSearchParams(location.search).get('demo')==='1'){playing=true;render();schedule();}
