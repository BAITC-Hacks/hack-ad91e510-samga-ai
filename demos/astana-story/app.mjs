import {baseline,presets,analyse,moveProject,districts,measures} from './comparison.mjs';
import {createComparisonMap} from './map.mjs';

const $=id=>document.getElementById(id);
const fmt=(n,d=1)=>n.toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
const exact=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
const catalog=new Map(measures.map(m=>[m.id,m]));
const reports=new Map(presets.map(p=>[p.id,analyse(p.choices)]));
for(const [id,report] of reports)if(!report.ok)throw new Error(id+': '+report.errors.join('; '));
const weak=reports.get('capital').result, better=reports.get('source').result, cheap=reports.get('cheap').result;
const copy=choices=>choices.map(c=>({...c}));
const tourSequence=[null,'capital','source','cheap','source'];
let activeId=null,choices=[],analysis=null,selected='Нура',showBefore=true,custom=false,tourIndex=0,playing=false,timer=null,cityMap=null;

const svg=body=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const symbols={
 S:svg('<path d="m3 9 9-6 9 6M5 8v13h14V8M9 21v-6h6v6M8 10h1m6 0h1"/>'),
 B:svg('<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6"/>'),
 E:svg('<path d="M20 3C9 2 3 7 5 15s16 4 15-12ZM5 21 16 8"/>'),
 C:svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4M7 8h10m-10 4h6"/>'),
 T:svg('<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 10h14M8 19v2m8-2v2M8 15h1m6 0h1"/>')
};
const shortNames={M7:'Школа и детсад',M8:'Поликлиника',M10:'Освещение и камеры',M12:'Платформа обращений',M5:'Чистое топливо',M9:'Дворовые спорт-хабы',M11:'Безопасные переходы',M4:'Парк и сквер'};
const labelNames={T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Качество воздуха',S1:'Школы и детсады',S2:'Медицина',B1:'Безопасность улиц',B2:'Безопасность дорог',C1:'Надёжность ЖКХ',C2:'Обращения жителей'};
const districtOptions=name=>districts.map(d=>'<option'+(d.name===name?' selected':'')+'>'+d.name+'</option>').join('');

function stop(){playing=false;clearTimeout(timer);timer=null;}
function current(){return showBefore||!activeId?baseline:analysis?.ok?analysis.result:null;}
function selectPlan(id,index=tourSequence.indexOf(id)){
 activeId=id;custom=false;tourIndex=index;
 choices=id?copy(presets.find(p=>p.id===id).choices):[];
 analysis=id?analyse(choices):null;showBefore=!id;selected='Нура';
 render();document.querySelector('.room-scroll').scrollTop=0;
}
function selectDistrict(name){stop();selected=name;render();}
function story(){
 if(showBefore||!activeId)return {
  kicker:'Сначала — потребности жителей',headline:'Кому помощь нужна в первую очередь?',
  text:'У города есть 100 единиц бюджета и пять решений. В Нуре школы и медицина уже в критической зоне. Проверим, какой план поможет жителям.',
  lesson:'<strong>'+baseline.critical+'</strong><div><b>проблемы ниже критической отметки</b><br>Школы и медицина Нуры. Одного роста среднего балла недостаточно.</div>',
  tone:'',action:activeId?'Показать результат плана':'Посмотреть неудачный план',
  mayor:'Оцените потребности районов до распределения денег. В этой модели результат зависит и от среднего по городу, и от самого слабого района.',
  mapTitle:'Исходный город',mapKicker:'Главный вопрос',mapText:'Помогут ли решения тем, кому сейчас сложнее всего?'
 };
 if(custom){
  const r=analysis?.result;
  const difference=r?r.score-better.score:0;
  const comparison=difference===0?'Итог совпадает с предложенным планом.':('Итог '+(difference>0?'выше':'ниже')+' предложенного плана на '+fmt(Math.abs(difference),2)+' балла.');
  const losses=analysis?.districts?.flatMap(d=>d.indicators.filter(i=>i.delta<0).map(i=>d.name+': '+labelNames[i.id]+' '+exact(i.delta)))??[];
  return {
   kicker:'Ваш вариант распределения',headline:'Вы меняете район — меняется результат.',
   text:'Меры и их стоимость остались прежними. Сравните, как новое распределение повлияло на районы.',
   lesson:r?'<strong>'+fmt(r.score)+'</strong><div><b>индекс качества жизни</b><br>Расходы '+r.cost+' / 100. Критических показателей: '+r.critical+'.</div>':'<div>План нарушает правила. Итог не рассчитывается.</div>',
   tone:r?.critical?'tradeoff':'good',action:'Сравнить с предложенным планом',
   mayor:r?(comparison+' '+(losses.length?'Есть ухудшение: '+losses[0]+'.':'Проверьте, в каких районах сохранились критические показатели.')):'Исправьте ошибки плана перед сравнением.',
   mapTitle:'Ваш вариант',mapKicker:'Проверьте свою гипотезу',mapText:'Кому досталась помощь после вашего изменения?'
  };
 }
 if(activeId==='capital')return {
  kicker:'Неудачный приоритет',headline:'Проекты в Есиле. Проблемы Нуры остаются.',
  text:'Школу, поликлинику, освещение и чистое топливо направили в Есиль. Городской балл вырос, но школы и медицина Нуры не изменились.',
  lesson:'<strong>'+weak.cost+'<small>/ 100</small></strong><div><b>потрачено, а '+weak.critical+' проблемы остались</b><br>Индекс города: '+fmt(baseline.score)+' → '+fmt(weak.score)+'.</div>',
  tone:'bad',action:'Перенести помощь в слабые районы',
  mayor:'Это допустимый, но несбалансированный план. Средний балл вырос до '+fmt(weak.average,2)+', а слабейший район остался на '+fmt(weak.minimum,2)+'. Два критических показателя снижают итог.',
  mapTitle:'Все районные проекты — в Есиль',mapKicker:'Почему план неудачный',mapText:'Один район получает четыре проекта. Нура ждёт школу и поликлинику.'
 };
 if(activeId==='cheap')return {
  kicker:'Другой приоритет — экономия',headline:'Сохранить резерв. Принять компромисс.',
  text:'Вместо школы и поликлиники — спорт-хабы, переходы, освещение и парк. Расходы ниже, но медицина Нуры остаётся в критической зоне.',
  lesson:'<strong>'+(100-cheap.cost)+'</strong><div><b>единиц остаются в резерве</b><br>Потрачено '+cheap.cost+'. Критических показателей: '+cheap.critical+'.</div>',
  tone:'tradeoff',action:'Сравнить итог трёх планов',
  mayor:'Резерв сам по себе не добавляет баллы. Безопасные переходы улучшают безопасность движения, но немного ухудшают разгрузку дорог. Экономия сохраняет проблему медицины.',
  mapTitle:'Меньше расходов, больше резерва',mapKicker:'У экономии есть цена',mapText:'Часть показателей выросла. Медицина Нуры всё ещё ниже 40.'
 };
 if(tourIndex===4)return {
  kicker:'Итог сравнения',headline:'Важна не только сумма. Важен получатель.',
  text:'Помощь слабым районам даёт лучший индекс из трёх показанных планов. Экономный вариант дешевле, но сохраняет критическую проблему.',
  lesson:'<strong>+'+fmt(better.score-weak.score,2)+'</strong><div><b>балла при тех же '+better.cost+' единицах</b><br>Перенесли проекты туда, где они нужнее.</div>',
  tone:'good',action:'Начать разбор заново',
  mayor:'Рекомендация — план помощи слабым районам, если цель в том, чтобы убрать критические провалы. Это сравнение трёх вариантов, а не доказательство глобального оптимума.',
  mapTitle:'Помощь по потребностям районов',mapKicker:'Предложение по результатам сравнения',mapText:'Те же мероприятия. Те же расходы. Больше пользы для слабых районов.'
 };
 return {
  kicker:'Предлагаемое исправление',headline:'Те же деньги. Помощь там, где она нужна.',
  text:'Переносим школу, поликлинику и освещение в Нуру. Чистое топливо — в Сарыарку. Платформа обращений по-прежнему работает для всего города.',
  lesson:'<strong>'+better.critical+'</strong><div><b>показателей ниже 40</b><br>Расходы прежние: '+better.cost+'. Индекс вырос до '+fmt(better.score)+'.</div>',
  tone:'good',action:'Проверить вариант дешевле',
  mayor:'При одинаковом бюджете итог лучше на '+fmt(better.score-weak.score,2)+' балла. При этом транспорт Нуры остаётся на '+exact(better.districts.find(d=>d.name==='Нура').values.T2)+': снятие критических провалов не решает все проблемы.',
  mapTitle:'Помощь слабым районам',mapKicker:'Меняем распределение, сохраняем бюджет',mapText:'Три проекта — в Нуру. Чистое топливо — в Сарыарку.'
 };
}
function renderPlans(){
 const tags={capital:'Районный перекос',source:'По потребностям',cheap:'Экономия бюджета'};
 $('plans').innerHTML=presets.map(p=>{
  const r=reports.get(p.id).result;
  const outcome=r.critical===0?'Критических проблем нет':r.critical===1?'1 критическая проблема':'2 критические проблемы';
  return '<button class="plan-card'+(activeId===p.id&&!custom?' selected':'')+'" data-plan="'+p.id+'" aria-pressed="'+(activeId===p.id&&!custom)+'"><span class="plan-label"><span>'+tags[p.id]+'</span>'+(p.id==='source'?'<b>Лучший из трёх</b>':'')+'</span><h3>'+p.title+'</h3><span class="plan-values"><span class="plan-score">'+fmt(r.score)+'<small>Индекс города</small></span><span class="plan-cost"><small>Расходы</small><b>'+r.cost+'</b> / 100</span></span><span class="plan-outcome"><i>'+(r.critical?'!':'✓')+'</i>'+outcome+'</span></button>';
 }).join('');
 for(const button of $('plans').querySelectorAll('button'))button.onclick=()=>{stop();selectPlan(button.dataset.plan);};
 $('comparison-note').textContent=custom?'Карточки показывают исходные варианты. Ваш результат — справа.':'В первых двух планах одинаковые меры и расходы. Меняются только районы.';
}
function renderImpacts(){
 const data=current();
 if(!data){$('impacts').textContent='План нарушает правила. Исправьте ошибки, чтобы увидеть последствия.';return;}
 const after=data.districts.find(d=>d.name===selected),before=baseline.districts.find(d=>d.name===selected);
 $('district-select').innerHTML=districtOptions(selected);
 let keys=selected==='Нура'?(activeId==='cheap'&&!showBefore?['S1','S2','T1']:['S1','S2','T2']):selected==='Сарыарка'?['E2','E1','C1']:selected==='Алматы'?['T1','C1','S2']:selected==='Есиль'?['S1','S2','B1']:['B1','C1','S2'];
 $('impacts').innerHTML=keys.map(key=>{
  const from=before.values[key],to=after.values[key],delta=to-from,critical=to<40;
  const status=showBefore?(critical?'Критическая зона':'Исходный уровень'):critical?(delta>0?'Лучше, но всё ещё ниже 40':'Проблема осталась'):from<40?'Вышли из критической зоны':delta<0?'Показатель ухудшился':delta>0?'Показатель улучшился':'Без изменений';
  return '<div class="impact"><div class="impact-title"><span>'+labelNames[key]+'</span><span class="'+(critical||delta<0?'bad-text':delta>0?'good-text':'')+'">'+status+'</span></div><div class="impact-values">'+(showBefore?'':'<span class="before-value">'+exact(from)+'</span><span class="arrow">→</span>')+'<strong class="'+(critical||delta<0?'critical-value':'')+'">'+exact(to)+'</strong><span class="unit">из 100</span></div><div class="impact-track"><span class="before-track" style="width:'+from+'%"></span><span class="after-track '+(critical||delta<0?'critical-track':'')+'" style="width:'+to+'%"></span>'+(!showBefore?'<span class="old-dot" style="left:'+from+'%"></span>':'')+'<span class="threshold"></span></div></div>';
 }).join('');
}
function renderEditor(){
 $('plan-editor').hidden=!activeId;
 if(!activeId)return;
 const spent=choices.reduce((sum,c)=>sum+catalog.get(c.id).cost,0);
 $('plan-cost').textContent=spent+' / 100';
 $('editor-result').textContent=analysis.ok?'Результат плана: '+fmt(analysis.result.score)+' балла · критических показателей: '+analysis.result.critical:'Результат не рассчитывается: исправьте план.';
 $('project-list').innerHTML=choices.map(c=>{
  const m=catalog.get(c.id);
  return '<div class="project-row"><span class="project-icon">'+symbols[m.group]+'</span><div><h3>'+shortNames[m.id]+'</h3>'+(m.type==='district'?'<select data-measure="'+m.id+'" aria-label="Район: '+shortNames[m.id]+'">'+districtOptions(c.district)+'</select>':'<span class="all-city">Весь город · район не выбирается</span>')+'</div><span class="price">'+m.cost+'<small>ед.</small></span></div>';
 }).join('');
 for(const select of $('project-list').querySelectorAll('select'))select.onchange=()=>{
  stop();const id=select.dataset.measure;const district=select.value;
  choices=moveProject(choices,id,district);analysis=analyse(choices);selected=district;custom=true;showBefore=false;tourIndex=-1;
  render();$('project-list').querySelector('[data-measure="'+id+'"]').focus();
 };
 $('restore-plan').hidden=!custom;
 $('validation').hidden=analysis.ok;
 $('validation').textContent=analysis.ok?'':analysis.errors.join(' ');
}
function renderCalculation(){
 const r=current();
 if(!r){$('calculation').textContent='Индекс не рассчитывается, пока план нарушает правила.';return;}
 $('calculation').innerHTML='<div class="calc-row"><span>Среднее по населению</span><strong>'+fmt(r.average,2)+' × 0,7</strong></div><div class="calc-row"><span>Самый слабый район</span><strong>'+fmt(r.minimum,2)+' × 0,3</strong></div><div class="calc-row"><span>Показателей ниже 40</span><strong>− '+r.critical+'</strong></div><div class="calc-formula">Индекс города: '+fmt(r.score,2)+' / 100</div><p class="calc-note">70% — результат по городу, 30% — самый слабый район. За каждый показатель ниже 40 снимается 1 балл. Учитываются лаги проектов, синергии и доли населения. Округление — только для показа.</p><p class="calc-note">Нулевой штраф не означает идеальный город. Рекомендуемый вариант лучший только среди трёх показанных. В демо действуют правила датасета: пять мер, не более двух из одного направления.</p>';
}
function render(){
 const content=story();document.body.dataset.scenario=showBefore?'baseline':custom?'custom':activeId;
 $('story-kicker').textContent=content.kicker;$('tour-position').textContent=custom?'Ваш план':(tourIndex+1)+' / 5';
 $('headline').textContent=content.headline;$('explanation').textContent=content.text;
 $('lesson').className='lesson '+content.tone;$('lesson').innerHTML=content.lesson;
 $('main-action').innerHTML=content.action+'<span>→</span>';$('mayor-takeaway').textContent=content.mayor;
 $('previous').disabled=tourIndex<=0;
 $('map-title').textContent=content.mapTitle;
 $('map-subtitle').textContent=showBefore?'5 районов · бюджет 100':analysis?.ok?'Расходы '+analysis.result.cost+' / 100':'Исправьте план';
 $('map-story').innerHTML='<span>'+content.mapKicker+'</span><p>'+content.mapText+'</p>';
 $('before').setAttribute('aria-pressed',String(showBefore));$('after').setAttribute('aria-pressed',String(!showBefore));$('after').disabled=!activeId;
 $('city-program').textContent=showBefore?'Выберите район на карте — справа появятся его показатели.':activeId==='source'&&!custom?'Пунктир — перенос районных проектов из Есиля. Обращения — для всего города.':'Обращения улучшаются во всём городе. На карте показано число районных проектов.';
 renderPlans();renderImpacts();renderEditor();renderCalculation();
 const data=current();
 cityMap?.present({data:data??baseline,choices:showBefore||!data?[]:choices,selected,scenarioId:activeId,before:showBefore||!data,custom});
 $('tour-label').textContent=playing?'Пауза':'Смотреть разбор';$('tour-icon').textContent=playing?'Ⅱ':'▶';$('tour').classList.toggle('playing',playing);
 $('tour-status').textContent=playing?'Автоматический показ':tourIndex===4?'Разбор завершён':custom?'Измените район или сравните планы':'Можно пройти по шагам';
}
function next(){
 if(activeId&&showBefore){showBefore=false;render();return;}
 if(custom){selectPlan('source',2);return;}
 const index=tourIndex===4?0:tourIndex+1;selectPlan(tourSequence[index],index);
}
function schedule(){
 clearTimeout(timer);
 if(!playing)return;
 timer=setTimeout(()=>{
  if(tourIndex===4){stop();render();return;}
  next();
  if(tourIndex===4){stop();render();}else schedule();
 },11000);
}
$('main-action').onclick=()=>{stop();next();};
$('previous').onclick=()=>{stop();const index=Math.max(0,tourIndex-1);selectPlan(tourSequence[index],index);};
$('reset').onclick=()=>{stop();selectPlan(null,0);};
$('tour').onclick=()=>{if(playing){stop();render();return;}if(custom||tourIndex===4)selectPlan(null,0);playing=true;render();schedule();};
$('before').onclick=()=>{stop();showBefore=true;render();};
$('after').onclick=()=>{stop();showBefore=false;render();};
$('district-select').onchange=event=>selectDistrict(event.target.value);
$('restore-plan').onclick=()=>{stop();selectPlan(activeId);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
render();
createComparisonMap({onSelect:selectDistrict,onStatus:(message,error=false)=>{$('map-status').textContent=message;$('map-status').hidden=!message;$('map-status').classList.toggle('error',error);}}).then(controller=>{cityMap=controller;render();});
