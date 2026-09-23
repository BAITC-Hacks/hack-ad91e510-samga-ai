import {baseline,result,projects,LAST_STEP,getFrame} from './demo-state.mjs';
import {createStoryMap} from './map.mjs';

const $=id=>document.getElementById(id);
const number=(value,digits=1)=>value.toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const value=(state,district,key)=>state.districts.find(d=>d.name===district).values[key];
const exact=value=>value.toLocaleString('ru-RU',{maximumFractionDigits:3});
const change=(district,key)=>`${exact(value(baseline,district,key))} → ${exact(value(result,district,key))}`;
const svg=body=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons=[
  svg('<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 10h14M8 19v2m8-2v2M8 15h1m6 0h1M9 6h6"/>'),
  svg('<path d="m12 2 5 7h-2l5 7H4l5-7H7l5-7Zm0 14v6m-4 0h8"/>'),
  svg('<path d="m3 9 9-6 9 6M5 8v13h14V8M9 21v-6h6v6M8 10h1m6 0h1M12 3V1l5 1-5 2"/>'),
  svg('<path d="M12 22V8m0 0H4V5h8m0 3h8V5h-8M5 5V3h6m2 0h6v2M4 10l-2 3m5-3v3m13-3 2 3m-5-3v3"/>'),
  svg('<path d="M14 6a5 5 0 0 0-6 6l-6 6 4 4 6-6a5 5 0 0 0 6-6l-3 3-4-4 3-3ZM16 2l6 6"/>')
];
const check=svg('<path d="m5 12 4 4L19 6"/>');
const warning=svg('<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>');
const titles=['Автобусные полосы','Новый парк','Школа и детсад','Свет и камеры','Бригады ЖКХ'];
const stories=[
  {title:'Автобусам —<br>свободную полосу.',description:'В Нуре слабо развит общественный транспорт. Выделяем полосу для автобусов, чтобы улучшить доступность поездок.',effect:`Доступность транспорта: <strong>${change('Нура','T2')}</strong>`},
  {title:'Больше зелени<br>для Сарыарки.',description:'Здесь мало зелени и слабый показатель качества воздуха. Новый парк улучшит среду и безопасность рядом с ним.',effect:`Озеленение Сарыарки: <strong>${change('Сарыарка','E1')}</strong>`},
  {title:'Школа там,<br>где её не хватает.',description:`В Нуре показатель школ и детсадов — ${exact(value(baseline,'Нура','S1'))} из 100, ниже критической отметки. Строим модульную школу и детсад.`,effect:`Школы и детсады Нуры: <strong>${change('Нура','S1')}</strong>`},
  {title:'Светлее улицы.<br>Спокойнее вечера.',description:'Добавляем освещение и камеры в Нуре. Эта мера начинает действовать раньше школы и улучшает безопасность улиц.',effect:`Безопасность улиц Нуры: <strong>${change('Нура','B1')}</strong>`},
  {title:'Быстрее помощь.<br>Надёжнее сети.',description:'Усиливаем аварийные бригады ЖКХ для всего города. Это решение улучшит надёжность сетей и обработку обращений во всех пяти районах.',effect:`Надёжность ЖКХ: <strong>+${exact(value(result,'Нура','C1')-value(baseline,'Нура','C1'))}</strong> в каждом районе`}
];
let step=0,playing=false,timer=null,compare=false,cityMap=null;

function insight(icon,title,description='',kind=''){
  return `<div class="insight ${kind}">${icon}<div>${title}${description?`<small>${description}</small>`:''}</div></div>`;
}
function renderStory(frame){
  let title,description,details,foot,next,label;
  if(frame.phase==='intro'){
    label='Ваш первый день в роли акима';title='Город ждёт<br>ваших решений.';
    description='У вас 100 единиц бюджета. Примите пять решений и узнайте, как изменится жизнь в городе за два года.';
    details=insight(icons[2],'<b>Нуре не хватает школ</b>',`Показатель ${exact(value(baseline,'Нура','S1'))} из 100 — ниже критической отметки.`)+insight(icons[1],'<b>Сарыарке нужно больше зелени</b>',`Озеленение — ${exact(value(baseline,'Сарыарка','E1'))} из 100.`);
    next='Начать выбор';foot='В демо пять решений уже подобраны. Пройдите их по шагам или включите показ.';
  }else if(frame.phase==='planning'){
    const p=projects[step-1],story=stories[step-1];
    label=`Решение ${step} из 5`;title=story.title;description=story.description;
    details=`<div class="cost-line">−${p.cost}<small>из бюджета города</small></div><div class="project-meta"><span>${p.district??'Все 5 районов'}</span><span>Эффект после ${p.lag} ${p.lag===1?'квартала':'кварталов'}</span></div><div class="effect-line">${story.effect}<small class="forecast-note"> · к концу 2 лет</small></div>`;
    next=step===5?'Проверить план':'Следующее решение';foot=`Проект добавлен в план. Остаток бюджета: ${frame.remaining} из 100.`;
  }else if(frame.phase==='ready'){
    label='План готов';title='Пять решений.<br>Один общий план.';
    description='Решения охватывают все пять направлений. Теперь посмотрим, как проекты начнут давать эффект в течение двух лет.';
    details=insight(check,`<b>${frame.cost} из 100 единиц потрачено</b>`,`${frame.remaining} остаются в резерве. Бонуса за остаток нет.`)+insight(check,'<b>Все правила соблюдены</b>','5 разных мер, бюджет и совместимость проверены.');
    next='Запустить 2 года';foot='Сначала начинаются работы. Каждый проект имеет свою задержку до эффекта.';
  }else if(frame.phase==='simulation'){
    const active=frame.projectStates.filter(s=>s==='active').length;
    label='План в действии';title=frame.quarter<=2?'Город начинает<br>меняться.':frame.quarter<8?'Решения начинают<br>давать результат.':'Два года<br>прошли.';
    description=frame.quarter===1?'Все пять проектов запущены. Быстрые меры требуют один квартал, строительство школы — три.':frame.quarter===2?'Освещение и бригады ЖКХ уже дают эффект. Автобусные полосы, парк и школа ещё в работе.':frame.quarter===3?'Автобусные полосы и парк начали давать эффект. Школе нужен ещё один квартал.':frame.quarter<8?'Все пять проектов дают эффект. Модель учитывает, какую часть двухлетнего периода они успели проработать.':'Можно сравнить город до и после решений: общий результат, районы и проблемы, которые остались.';
    details=`<div class="quarter-big">${frame.quarter}<small>квартал из 8</small></div><div class="progress-summary">${active} из 5 проектов дают эффект</div>`;
    next=frame.quarter===8?'Посмотреть результат':'Следующий квартал';foot='Шкала показывает сроки начала эффекта. Итоговый индекс рассчитывается на конец двух лет.';
  }else{
    label='Результат через 2 года';title='Город стал лучше.<br>Работа продолжается.';
    description='Нура получила транспорт, школу и безопасные улицы. Сарыарка — парк. Улучшения ЖКХ затронули весь город.';
    details=`<div class="result-gain">+${number(result.score-baseline.score,2)} <small>к индексу города</small></div>`+insight(check,'<b>Школы Нуры вышли из критической зоны</b>',`${change('Нура','S1')} из 100.`)+insight(warning,'<b>Медицина Нуры остаётся слабым местом</b>',`${exact(value(result,'Нура','S2'))} из 100. В этом плане нет поликлиники.`,'warning');
    next='Пройти ещё раз';foot='Пояснение подготовлено для демо. Все показатели рассчитаны моделью.';
  }
  $('phase-label').textContent=label;$('step-count').textContent=frame.phase==='simulation'?`${frame.quarter} / 8`:frame.phase==='intro'?'Начало':frame.phase==='result'?'Финал':`${Math.min(step,5)} / 5`;
  $('story-title').innerHTML=title;$('story-description').textContent=description;$('story-details').innerHTML=details;
  $('story-foot').textContent=foot;$('next').innerHTML=`${next}<span>${frame.phase==='result'?'↶':'→'}</span>`;$('back').disabled=step===0;
}
function renderPulse(frame){
  const after=frame.showResult&&!compare,data=after?result:baseline;
  $('city-score').textContent=number(data.score);$('score-fill').style.width=`${data.score}%`;
  $('score-state').textContent=after?'Через 2 года':'До решений';
  $('score-note').textContent=after?`Было ${number(baseline.score)} · стало лучше на ${number(result.score-baseline.score,2)}`:frame.phase==='simulation'?'Итог — после 8 кварталов':'Стартовая оценка города';
  $('district-column').textContent=after?'Индекс / рост':'Индекс';
  $('districts').innerHTML=data.districts.map((d,i)=>{
    const focus=frame.phase==='planning'?projects[step-1].district===d.name:after&&d.name==='Нура';
    return `<div class="district-row ${focus?'focus':''}"><i></i><span>${d.name}</span><b>${number(d.score)}</b>${after?`<span class="district-gain">+${number(d.score-baseline.districts[i].score)}</span>`:`<span class="district-bar"><span style="width:${d.score}%"></span></span>`}</div>`;
  }).join('');
  $('critical-count').textContent=`${data.critical} ${data.critical===1?'критический показатель':'критических показателя'}`;$('critical-note').textContent=after?`Медицина Нуры — ${exact(value(result,'Нура','S2'))} из 100.`:'Школы и медицина в Нуре — ниже 40.';
  $('compare').hidden=!frame.showResult;$('compare').innerHTML=compare?'Вернуть результат <span>↔</span>':'Сравнить с началом <span>↔</span>';
}
function renderDeck(frame){
  $('budget').textContent=frame.cost;$('remaining').textContent=`Осталось ${frame.remaining}`;$('decisions-count').textContent=`${frame.selectedCount} из 5 решений`;
  const stateLabels={pending:'Ещё не выбрано',planned:'В плане',building:'Работы идут',active:'Даёт эффект'};
  $('decisions').innerHTML=projects.map((p,i)=>`<button class="decision ${frame.projectStates[i]} ${step===i+1?'current':''}" data-decision="${i+1}" aria-label="Решение ${i+1}: ${titles[i]}. ${stateLabels[frame.projectStates[i]]}" ${step===i+1?'aria-current="step"':''}><span class="decision-symbol"><span class="decision-number">${i+1}</span>${icons[i]}</span><span class="decision-info"><b>${titles[i]}</b><small>${frame.phase==='simulation'?stateLabels[frame.projectStates[i]]:`${p.district??'Весь город'} · ${p.cost}`}</small></span><span class="decision-status">${frame.projectStates[i]==='pending'?'':frame.projectStates[i]==='building'?'◷':'✓'}</span></button>`).join('');
  for(const button of $('decisions').querySelectorAll('button'))button.onclick=()=>{pause();go(Number(button.dataset.decision));};
  $('quarters').innerHTML=Array.from({length:8},(_,i)=>`<span class="quarter ${i<frame.quarter?'done':''} ${i+1===frame.quarter?'current':''}" title="Квартал ${i+1}"></span>`).join('');
  $('timeline-label').textContent=frame.phase==='simulation'?`Квартал ${frame.quarter} из 8`:frame.showResult?'2 года спустя':'Сначала — план';
  $('timeline-end').textContent=frame.showResult?'Результат рассчитан':frame.phase==='simulation'?`${frame.quarter*3} из 24 месяцев`:'Затем — 2 года развития';
}
function render(){
  const frame=getFrame(step);document.body.className=`phase-${frame.phase}`;
  renderStory(frame);renderPulse(frame);renderDeck(frame);
  $('map-caption').textContent=frame.phase==='planning'?`${projects[step-1].district??'Весь город'} · ${titles[step-1]}`:frame.phase==='simulation'?'Проекты в работе · точки размещены условно':frame.showResult?'Пять решений изменили город':'Астана · пять районов в модели';
  cityMap?.present(frame);
  $('play-label').textContent=playing?'Пауза':step===LAST_STEP?'Повторить демо':step===0?'Смотреть демо':'Продолжить демо';
  $('play-icon').textContent=playing?'Ⅱ':'▶';$('play').classList.toggle('playing',playing);
  $('play-status').textContent=playing?'Демо идёт автоматически · можно поставить на паузу':step===LAST_STEP?'Сценарий завершён':step===0?'Можно пройти весь сценарий вручную':'Показ на паузе · продолжайте вручную или автоматически';
}
function go(next){step=Math.max(0,Math.min(LAST_STEP,next));compare=false;render();}
function pause(){playing=false;clearTimeout(timer);timer=null;}
function schedule(){
  clearTimeout(timer);
  if(!playing)return;
  const delay=step===0?2500:step<=5?6000:step===6?5000:2300;
  timer=setTimeout(()=>{if(step===LAST_STEP){pause();render();return;}go(step+1);if(step===LAST_STEP){pause();render();}else schedule();},delay);
}
$('play').onclick=()=>{if(playing){pause();render();return;}if(step===LAST_STEP)go(0);playing=true;render();schedule();};
$('next').onclick=()=>{pause();go(step===LAST_STEP?0:step+1);};
$('back').onclick=()=>{pause();go(step-1);};
$('restart').onclick=()=>{pause();go(0);};
$('compare').onclick=()=>{compare=!compare;renderPulse(getFrame(step));};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){pause();render();}});
render();
createStoryMap({projects,titles,icons,onStatus:(message,error=false)=>{$('map-status').textContent=message;$('map-status').hidden=!message;$('map-status').classList.toggle('error',error);}}).then(controller=>{cityMap=controller;cityMap.present(getFrame(step));});
