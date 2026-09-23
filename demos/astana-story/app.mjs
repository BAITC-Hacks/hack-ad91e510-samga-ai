import {baseline,presets,analyse,moveProject,districts,measures} from './comparison.mjs';
import {createComparisonMap} from './map.mjs';
import {icon} from './shell.mjs';

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
const names={M7:'Школа и детсад',M8:'Поликлиника',M10:'Освещение и камеры',M12:'Платформа обращений',M5:'Чистое топливо',M9:'Дворовые спорт-хабы',M11:'Безопасные переходы',M4:'Парк / сквер'};
const labels={S1:'Школы и детсады',S2:'Медицина',T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',B1:'Безопасность улиц',B2:'Безопасность дорог',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
let stage=0,activeId=null,choices=[],analysis=null,selected='Нура',before=true,custom=false,playing=false,timer=null,cityMap=null;
const current=()=>before||!activeId?baseline:analysis?.ok?analysis.result:null;
const value=(r,d,k)=>r.districts.find(x=>x.name===d).values[k];
function stop(){playing=false;clearTimeout(timer);timer=null;}
function chooseStage(index){
 stage=index;activeId=stages[index].id;custom=false;before=!activeId;selected='Нура';
 choices=activeId?presets.find(p=>p.id===activeId).choices.map(c=>({...c})):[];
 analysis=activeId?analyse(choices):null;
 render();cityMap?.setView(activeId?'districts':'city');
 if(index===0)window.scrollTo({top:0,behavior:'instant'});
}
function choosePreset(id){chooseStage(stages.findIndex(s=>s.id===id));}
function narrative(){
 if(before&&activeId)return {title:'Исходные показатели выбранного плана',copy:'Показатели показаны до решений. Бюджет и список проектов относятся к выбранному плану.',facts:[{text:'До изменений у Нуры <strong>'+exact(value(baseline,'Нура','S1'))+'</strong> по школам и <strong>'+exact(value(baseline,'Нура','S2'))+'</strong> по медицине.',risk:true},{text:'Вернитесь к результату, чтобы сравнить эффект выбранных проектов.'}],action:'Показать результат плана'};
 if(custom)return {title:'Свой вариант распределения',copy:'Районы проектов изменены. Все виджеты показывают новый расчёт.',facts:analysis?.ok?[{text:'Индекс города <strong>'+fmt(analysis.result.score)+'</strong>. Расходы <strong>'+analysis.result.cost+'</strong> из 100.'},{text:'Критических показателей: <strong>'+analysis.result.critical+'</strong>. Сравните с готовыми вариантами ниже.',risk:analysis.result.critical>0}]:[{text:'План нарушает правила. Расчёт недоступен.',risk:true}],action:'Сравнить с предложенным планом'};
 if(stage===0)return {title:'Исходная ситуация',copy:'Нура: школы '+exact(value(baseline,'Нура','S1'))+', медицина '+exact(value(baseline,'Нура','S2'))+'. Бюджет — 100 единиц, решений должно быть пять.',facts:[{text:'<strong>Школы и медицина Нуры</strong> находятся ниже критической отметки 40.',risk:true},{text:'Сравним, как разные планы изменят город при одном и том же бюджете.'}],action:'Показать неудачный план'};
 if(stage===1)return {title:'Неудачный приоритет',copy:'Все районные проекты направлены в Есиль. Потрачено 95, две критические проблемы Нуры остались.',facts:[{text:'У Нуры по-прежнему <strong>'+exact(value(weak,'Нура','S1'))+'</strong> по школам и <strong>'+exact(value(weak,'Нура','S2'))+'</strong> по медицине.',risk:true},{text:'Те же меры можно перенести в слабые районы, сохранив расходы <strong>'+weak.cost+'</strong>.'}],action:'Перераспределить помощь'};
 if(stage===2)return {title:'Перераспределение',copy:'Школа, поликлиника и освещение — в Нуру; чистое топливо — в Сарыарку. Расходы остались 95.',facts:[{text:'<strong>Оба критических провала устранены.</strong> Школы Нуры '+exact(value(better,'Нура','S1'))+', медицина '+exact(value(better,'Нура','S2'))+'.'},{text:'Транспорт Нуры остаётся на <strong>'+exact(value(better,'Нура','T2'))+'</strong>. Этот план не решает все проблемы.'}],action:'Проверить вариант дешевле'};
 if(stage===3)return {title:'Экономный вариант',copy:'Расходы — '+economy.cost+', резерв — '+(100-economy.cost)+'. Медицина Нуры всё ещё ниже 40, разгрузка дорог ухудшилась.',facts:[{text:'В резерве <strong>'+(100-economy.cost)+'</strong> единиц. Но медицина Нуры — <strong>'+exact(value(economy,'Нура','S2'))+'</strong>.',risk:true},{text:'Безопасные переходы улучшают безопасность, но снижают разгрузку дорог: <strong>'+exact(value(baseline,'Нура','T1'))+' → '+exact(value(economy,'Нура','T1'))+'</strong>.',risk:true}],action:'Сравнить итог'};
 return {title:'Итог сравнения',copy:'Распределение помощи по потребностям даёт лучший индекс среди трёх показанных вариантов.',facts:[{text:'При тех же расходах <strong>'+better.cost+'</strong> итог выше на <strong>'+fmt(better.score-weak.score)+'</strong> балла.'},{text:'Это лучший из трёх примеров. Экономный вариант дешевле, но сохраняет проблему медицины.'}],action:'Начать заново'};
}
function renderControls(){
 const options=[{id:'',title:'Исходный город'},...presets];
 $('scenario-select').innerHTML=options.map(p=>'<option value="'+p.id+'"'+((!custom&&(activeId??'')===p.id)?' selected':'')+'>'+p.title+'</option>').join('')+(custom?'<option value="custom" selected>Свой вариант</option>':'');
 $('demo-stages').innerHTML=stages.map((s,i)=>'<button class="demo-stage'+(!custom&&stage===i?' active':'')+(!custom&&stage>i?' done':'')+'" data-stage="'+i+'"'+(!custom&&stage===i?' aria-current="step"':'')+'><span class="stage-dot">'+(i+1)+'</span><span>'+s.name+'</span></button>').join('');
 for(const b of $('demo-stages').querySelectorAll('button'))b.onclick=()=>{stop();chooseStage(Number(b.dataset.stage));};
 $('play-label').textContent=playing?'Пауза':'Демонстрация';$('play-demo').classList.toggle('playing',playing);
 $('play-demo').querySelector('i').innerHTML=icon(playing?'pause':'play');
 $('play-status').textContent=playing?'Автопоказ':custom?'Свой вариант':stage===4?'Показ завершён':'Ручной режим';
 const n=narrative();$('stage-number').textContent=custom?'—':String(stage+1).padStart(2,'0');$('stage-title').textContent=n.title;$('stage-copy').textContent=n.copy;
 $('next-step').innerHTML=(stage===4&&!custom?'Сначала':'Следующий шаг')+'<i>'+icon('next')+'</i>';
}
function renderMetrics(){
 const data=current(),spent=choices.reduce((sum,c)=>sum+catalog.get(c.id).cost,0);
 $('budget-used').textContent=spent;$('budget-free').textContent=(100-spent)+' в резерве';$('budget-fill').style.width=spent+'%';
 $('budget-status').textContent=activeId?'План':'Доступно';
 const groups=new Set(choices.map(c=>catalog.get(c.id).group));
 $('decision-count').textContent=choices.length+' из 5 решений'+(choices.length?' · направлений: '+groups.size:'');
 $('score-value').textContent=data?fmt(data.score):'—';$('score-base').textContent=fmt(baseline.score);
 const delta=data?data.score-baseline.score:0;$('score-delta').textContent=!data?'Нет расчёта':delta===0?'Исходный':(delta>0?'+':'')+fmt(delta);
 $('score-delta').className='score-delta '+(delta>=0?'positive':'negative');$('score-horizon').textContent=before?'Сейчас':'Через 2 года';
 $('critical-value').textContent=data?data.critical:'—';
 const critical=data?data.districts.flatMap(d=>d.critical.map(key=>({district:d.name,key}))):[];
 $('critical-summary').textContent=!data?'План невалиден':critical.length?[...new Set(critical.map(c=>c.district))].join(', '):'показателей ниже 40';
 $('critical-tags').innerHTML=!data?'':critical.length?critical.map(c=>'<span class="critical-tag">'+labels[c.key]+'</span>').join(''):'<span class="critical-tag good">Критических провалов нет</span>';
}
function renderDecisions(){
 $('plan-status').textContent=choices.length?choices.length+' / 5':'Не выбраны';
 if(!choices.length){$('decisions').innerHTML=Array.from({length:5},(_,i)=>'<div class="decision-placeholder"><span class="decision-index">'+(i+1)+'</span><span>Решение не выбрано</span><span class="placeholder-line"></span></div>').join('');}
 else{
  $('decisions').innerHTML=choices.map((c,i)=>{
   const m=catalog.get(c.id);
   return '<div class="decision-row"><span class="decision-index">'+(i+1)+'</span><div class="decision-body"><strong>'+names[c.id]+'</strong>'+(m.type==='district'?'<select data-project="'+m.id+'" aria-label="Район: '+names[c.id]+'">'+districts.map(d=>'<option'+(d.name===c.district?' selected':'')+'>'+d.name+'</option>').join('')+'</select>':'<span>Весь город</span>')+'</div><span class="decision-cost">'+m.cost+'<small>ед.</small></span></div>';
  }).join('');
  for(const select of $('decisions').querySelectorAll('select'))select.onchange=()=>{
   stop();const id=select.dataset.project;selected=select.value;choices=moveProject(choices,id,select.value);analysis=analyse(choices);custom=true;before=false;
   render();$('decisions').querySelector('[data-project="'+id+'"]').focus();cityMap?.setView('districts');
  };
 }
 $('plan-note').textContent=!choices.length?'Выберите вариант или начните демонстрацию.':analysis.ok?'Можно изменить район любого проекта.':'Нарушены правила сценария.';
 $('restore-plan').hidden=!custom;$('validation').hidden=!analysis||analysis.ok;$('validation').textContent=analysis&&!analysis.ok?analysis.errors.join(' '):'';
}
function renderDistricts(){
 const data=current();$('show-before').setAttribute('aria-pressed',String(before));$('show-after').setAttribute('aria-pressed',String(!before));$('show-after').disabled=!activeId;
 if(!data){$('district-list').textContent='Исправьте план.';$('impacts').textContent='Показатели не рассчитываются.';return;}
 $('district-list').innerHTML=data.districts.map(d=>'<button class="district-row'+(d.name===selected?' selected':'')+(d.critical.length?' risk':'')+'" data-district="'+d.name+'" aria-pressed="'+(d.name===selected)+'"><i></i><span>'+d.name+'</span><b>'+fmt(d.score,1)+'</b></button>').join('');
 for(const b of $('district-list').querySelectorAll('button'))b.onclick=()=>{stop();selected=b.dataset.district;render();};
 $('selected-district').textContent=selected;$('district-caption').textContent='Индексы 0–100 · порог 40';
 const keys=selected==='Нура'?(activeId==='cheap'&&!before?['S1','S2','T1']:['S1','S2','T2']):selected==='Сарыарка'?['E2','E1','C1']:selected==='Алматы'?['T1','C1','S2']:selected==='Есиль'?['S1','S2','B1']:['B1','B2','C1'];
 $('impacts').innerHTML=keys.map(key=>{
  const from=value(baseline,selected,key),to=value(data,selected,key),delta=to-from;
  const hint=to<40?'Ниже критической отметки':delta<0?'Ухудшение':from<40&&to>=40?'Критический провал устранён':delta>0?'Улучшение':'Без изменений';
  return '<div class="impact-line'+(to<40?' risk':'')+(delta<0?' loss':'')+'"><div class="impact-label"><span>'+labels[key]+'</span><span>'+(!before?'<span class="old-value">'+exact(from)+' → </span>':'')+'<b>'+exact(to)+'</b></span></div><div class="impact-track"><i style="width:'+to+'%"></i><span class="threshold"></span></div><small class="impact-hint">'+hint+'</small></div>';
 }).join('');
}
function renderReview(){
 const n=narrative();$('review-facts').innerHTML=n.facts.map(f=>'<div class="review-fact'+(f.risk?' risk':'')+'"><i>'+icon(f.risk?'warning':'check')+'</i><div>'+f.text+'</div></div>').join('');
 $('recommendation').innerHTML=n.action+'<i>'+icon('arrow')+'</i>';
}
function renderComparison(){
 const tradeoffs={capital:'Школы и медицина Нуры без улучшений',source:'Транспорт Нуры остаётся на 40',cheap:'Медицина ниже 40; дороги ухудшились'};
 $('comparison-rows').innerHTML=presets.map(p=>{
  const r=reports.get(p.id).result,selectedPlan=activeId===p.id&&!custom;
  return '<tr class="'+(selectedPlan?'selected':'')+'"><td>'+p.title+'</td><td>'+r.cost+' / 100</td><td class="score-cell">'+fmt(r.score)+'</td><td class="'+(r.critical?'risk-label':'good-label')+'">'+r.critical+'</td><td>'+tradeoffs[p.id]+'</td><td><button data-preset="'+p.id+'" aria-label="Выбрать вариант '+p.title+'">'+(selectedPlan?'Выбран':'Выбрать')+'</button></td></tr>';
 }).join('');
 for(const b of $('comparison-rows').querySelectorAll('button'))b.onclick=()=>{stop();choosePreset(b.dataset.preset);};
 $('comparison-foot').textContent=custom?'Ваш вариант показан в виджетах выше. Таблица сохраняет исходные планы для сравнения.':'Первые два плана содержат одинаковые меры. Меняются только районы. Лучший балл — среди этих трёх вариантов.';
}
function renderMap(){
 const data=current();$('map-indication').textContent=!data?'Расчёт недоступен':before?'Исходное состояние':custom?'Свой вариант · через 2 года':'После решений · через 2 года';
 const local=choices.filter(c=>c.district===selected).length;
 $('map-foot').textContent=before?'Нажмите «Районы», чтобы увидеть потребности города.':selected+': районных проектов — '+local+'. Городские меры действуют во всех районах.';
 cityMap?.present({data:data??baseline,choices:before||!data?[]:choices,selected,scenarioId:activeId,before:before||!data,custom});
}
function render(){renderControls();renderMetrics();renderDecisions();renderDistricts();renderReview();renderComparison();renderMap();}
function advance(){
 if(before&&activeId){before=false;render();return;}
 chooseStage(custom?2:stage===4?0:stage+1);
 if(stage===4)$('compare-widget').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'end'});
 if(stage===0)window.scrollTo({top:0,behavior:'instant'});
}
function schedule(){
 clearTimeout(timer);if(!playing)return;
 timer=setTimeout(()=>{if(stage===4){stop();render();return;}advance();if(stage===4){stop();render();}else schedule();},10000);
}
$('scenario-select').onchange=event=>{if(event.target.value==='custom')return;stop();choosePreset(event.target.value||null);};
$('next-step').onclick=()=>{stop();advance();};$('recommendation').onclick=()=>{stop();advance();};
$('restore-plan').onclick=()=>{stop();choosePreset(activeId);};
$('show-before').onclick=()=>{stop();before=true;render();};$('show-after').onclick=()=>{stop();before=false;render();};
$('play-demo').onclick=()=>{if(playing){stop();render();return;}if(custom||stage===4)chooseStage(0);window.scrollTo({top:0,behavior:'instant'});playing=true;render();schedule();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
render();
createComparisonMap({onSelect:name=>{stop();selected=name;render();},onStatus:(message,error=false)=>{$('map-status').textContent=message;$('map-status').hidden=!message;$('map-status').classList.toggle('error',error);}}).then(controller=>{cityMap=controller;renderMap();cityMap.setView(activeId?'districts':'city');});
if(new URLSearchParams(location.search).get('demo')==='1'){playing=true;render();schedule();}
