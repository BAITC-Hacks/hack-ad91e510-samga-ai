import {indicators,districts,measures} from './data.mjs';

const catalog=new Map(measures.map(m=>[m.id,m]));
// allowIncomplete нужен только редактору; evaluate() всегда требует ровно пять.
export function validate(choices,{allowIncomplete=false}={}){
 const errors=[];
 if(!Array.isArray(choices)) return ['Передайте список решений.'];
 if(choices.length>5||(!allowIncomplete&&choices.length!==5))errors.push('Нужно ровно 5 решений.');
 const used=new Set(),counts={}; let cost=0;
 for(const c of choices){
  const m=catalog.get(c?.id);
  if(!m){errors.push('Неизвестное мероприятие.');continue;}
  if(used.has(m.id))errors.push(`${m.id}: повтор мероприятия запрещён.`);
  used.add(m.id);cost+=m.cost;counts[m.group]=(counts[m.group]||0)+1;
  if(m.type==='district'&&!districts.some(d=>d.name===c.district))errors.push(`${m.id}: укажите существующий район.`);
  if(m.type==='city'&&c.district!==undefined)errors.push(`${m.id}: для городской меры район не указывается.`);
 }
 if(cost>100)errors.push('Бюджет превышает 100 единиц.');
 if(Object.values(counts).some(n=>n>2))errors.push('Не более двух мер одного направления.');
 if(used.has('M1')&&used.has('M3'))errors.push('M1 и M3 несовместимы во всём городе.');
 for(const [a,b] of [['M4','M7'],['M5','M13']]){
  const ca=choices.find(c=>c?.id===a),cb=choices.find(c=>c?.id===b);
  if(ca&&cb&&ca.district===cb.district)errors.push(`${a} и ${b} несовместимы в одном районе.`);
 }
 return errors;
}

// Неполные наборы здесь разрешены только для анализа базы и отдельных эффектов.
// Полная проверка допустимости итогового сценария выполняется evaluate().
export function simulate(choices){
 const state=districts.map(d=>({...d,values:{...d.values}}));
 let cost=0;
 for(const choice of choices){
  const m=catalog.get(choice.id);
  if(!m)throw new Error(`Неизвестная мера ${choice.id}`);
  cost+=m.cost;
  for(const d of state){
   if(m.type==='district'&&d.name!==choice.district)continue;
   for(const [k,effect] of Object.entries(m.effects))d.values[k]+=effect*(8-m.lag)/8;
  }
 }
 const synergies=[];
 for(const [a,b,k] of [['M1','M2','T1'],['M10','M12','B1'],['M5','M6','E2']]){
  const first=choices.find(c=>c.id===a);
  if(first&&choices.some(c=>c.id===b)){
   const d=state.find(d=>d.name===first.district);
   if(!d)throw new Error(`Для синергии ${a} + ${b} не указан район ${a}`);
   d.values[k]+=2;synergies.push({pair:`${a} + ${b}`,district:d.name,indicator:k,bonus:2});
  }
 }
 let critical=0,average=0;
 for(const d of state){
  d.score=0;d.critical=[];
  for(const k of indicators){
   d.values[k.id]=Math.min(100,Math.max(0,d.values[k.id]));
   d.score+=k.weight*d.values[k.id];
   if(d.values[k.id]<40){critical++;d.critical.push(k.id);}
  }
  average+=d.pop*d.score;
 }
 const minimum=Math.min(...state.map(d=>d.score));
 return {cost,districts:state,average,minimum,critical,score:.7*average+.3*minimum-critical,synergies};
}

export function evaluate(choices){
 const errors=validate(choices);
 if(errors.length)return {errors};
 return {...simulate(choices),errors};
}
