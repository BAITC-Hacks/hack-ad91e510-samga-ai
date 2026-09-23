import {districts,measures} from './comparison.mjs';
import {inspectDraft,proposeChoice,realizedEffects} from './planner.mjs';

const groups={T:'Транспорт',E:'Экология',S:'Соцсфера',B:'Безопасность',C:'Сервисы'};
const labels={T1:'Разгрузка дорог',T2:'Общественный транспорт',E1:'Озеленение',E2:'Воздух',S1:'Школы и детсады',S2:'Медицина',B1:'Безопасность улиц',B2:'Безопасность дорог',C1:'ЖКХ',C2:'Обращения'};
const exact=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:3});

export function createCatalog({getChoices,getSelectedDistrict,onApply}){
 const dialog=document.querySelector('#measure-dialog');
 const $=id=>dialog.querySelector('#'+id);
 let replaceIndex=null,district='Нура',group='all',indicator=null;
 function render(){
  const choices=getChoices();
  const base=choices.filter((_,i)=>i!==replaceIndex);
  const state=inspectDraft(base);
  $('catalog-title').textContent=replaceIndex===null?'Добавить решение':'Заменить решение '+(replaceIndex+1);
  $('catalog-budget').textContent='Доступно для выбора: '+state.remaining+' из 100';
  $('catalog-slot').innerHTML='<option value="new"'+(replaceIndex===null?' selected':'')+(choices.length>=5?' disabled':'')+'>'+(choices.length>=5?'Выберите решение для замены':'Новое решение ('+(choices.length+1)+' из 5)')+'</option>'+choices.map((c,i)=>'<option value="'+i+'"'+(replaceIndex===i?' selected':'')+'>Вместо №'+(i+1)+': '+measures.find(m=>m.id===c.id).name+'</option>').join('');
  $('catalog-district').innerHTML=districts.map(d=>'<option'+(district===d.name?' selected':'')+'>'+d.name+'</option>').join('');
  $('catalog-need').hidden=!indicator;
  $('catalog-need-label').textContent=indicator?'Меры для показателя «'+labels[indicator]+'»':'';
  $('catalog-groups').innerHTML=[['all','Все меры'],...Object.entries(groups)].map(([id,name])=>'<button type="button" data-group="'+id+'" aria-pressed="'+(group===id)+'">'+name+(id==='all'?'':' <small>'+(state.directions[id]??0)+'/2</small>')+'</button>').join('');
  for(const b of $('catalog-groups').querySelectorAll('button'))b.onclick=()=>{group=b.dataset.group;indicator=null;render();$('catalog-groups').querySelector('[data-group="'+group+'"]').focus();};
  const filtered=measures.filter(m=>(group==='all'||m.group===group)&&(!indicator||(m.effects[indicator]??0)>0));
  $('catalog-cards').innerHTML=filtered.map(m=>{
   const proposal=proposeChoice(choices,m.id,district,replaceIndex);
   const needsSlot=choices.length===5&&replaceIndex===null;
   const reason=needsSlot?'Выберите, какое решение заменить.':proposal.errors[0]??'';
   const effects=realizedEffects(m.id).map(e=>'<span class="catalog-effect'+(e.delta<0?' negative':'')+'">'+labels[e.id]+' <b>'+(e.delta>0?'+':'')+exact(e.delta)+'</b></span>').join('');
   return '<article class="measure-card'+(reason?' unavailable':'')+'"><div class="measure-top"><span>'+m.id+' · '+groups[m.group]+'</span><strong>'+m.cost+' <small>ед.</small></strong></div><h3>'+m.name+'</h3><div class="measure-meta"><span>'+ (m.type==='city'?'Весь город':district)+'</span><span>Задержка '+m.lag+' кв.</span></div><div class="measure-effects">'+effects+'</div><div class="measure-action"><p>'+reason+'</p><button type="button" data-measure="'+m.id+'"'+(reason?' disabled':'')+' aria-label="'+(replaceIndex===null?'Добавить: ':'Выбрать замену: ')+m.name+'">'+(replaceIndex===null?'Добавить':'Выбрать')+'</button></div></article>';
  }).join('')||'<p class="catalog-empty">В каталоге нет мер для этого показателя.</p>';
  for(const b of $('catalog-cards').querySelectorAll('[data-measure]'))b.onclick=()=>{
   const proposal=proposeChoice(getChoices(),b.dataset.measure,district,replaceIndex);
   if(!proposal.allowed){$('catalog-message').textContent=proposal.errors.join(' ');return;}
   const index=replaceIndex??getChoices().length;
   dialog.close();onApply(proposal.choices,{index,district:proposal.choice.district,replaced:replaceIndex!==null});
  };
 }
 $('catalog-district').onchange=event=>{district=event.target.value;render();};
 $('catalog-slot').onchange=event=>{replaceIndex=event.target.value==='new'?null:Number(event.target.value);render();};
 $('catalog-close').onclick=()=>dialog.close();
 $('catalog-clear-filter').onclick=()=>{indicator=null;group='all';render();$('catalog-groups').querySelector('[data-group="all"]').focus();};
 return {open(options={}){
  replaceIndex=options.replaceIndex??null;district=(replaceIndex!==null?getChoices()[replaceIndex]?.district:null)??getSelectedDistrict();group='all';indicator=options.indicator??null;
  $('catalog-message').textContent='';render();dialog.showModal();
 }};
}
