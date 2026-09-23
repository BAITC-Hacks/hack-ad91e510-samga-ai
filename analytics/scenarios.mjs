import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {evaluate,simulate,validate} from '../docs/brief-analysis/dist/model.mjs';
import {districts,measures,indicators} from '../docs/brief-analysis/dist/data.mjs';
export const MODEL_VERSION='docx-8q-v1';
export const MODEL_INFO=Object.freeze({version:MODEL_VERSION,years:2,quarters:8,budget:100,
 source:'docs/brief-analysis/dist/sources/dataset.docx',type:'educational',
 assumptions:['Ровно пять разных мер; максимум две одного направления по DOCX.',
 'Расхождение с формулировкой PDF о пяти направлениях не разрешено.',
 'Баллы учебной модели не переводятся в минуты, проценты заболеваний или деньги.',
 'Годовые траектории и прогнозы на пять и десять лет не калиброваны.']});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dataHash=hash({districts,measures,indicators});
const byId=new Map(measures.map(m=>[m.id,m]));
export function validateChoices(choices,{partial=false}={}){
 if(!Array.isArray(choices))return ['Ожидается массив решений.'];
 const errors=[];
 for(const c of choices){
  if(!c||typeof c!=='object'||Array.isArray(c)){errors.push('Решение должно быть объектом.');continue;}
  if(Object.keys(c).some(k=>!['id','district'].includes(k)))errors.push('Передавайте только id и district; цена и эффект определяются сервером.');
  const m=byId.get(c.id);if(!m){errors.push('Неизвестное мероприятие.');continue;}
  if(m.type==='city'&&Object.hasOwn(c,'district'))errors.push(c.id+': городская мера не имеет района.');
  if(m.type==='district'&&!districts.some(d=>d.name===c.district))errors.push(c.id+': необходим существующий район.');
 }
 if(errors.length)return errors;
 const all=validate(choices);
 return partial?all.filter(e=>e!=='Нужно ровно 5 решений.'):all;
}
export function canonicalChoices(choices){
 return choices.map(c=>c.district===undefined?{id:c.id}:{id:c.id,district:c.district})
 .sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
}
function snapshot(r){const {cost,score,average,minimum,critical,synergies}=r;return {cost,score,average,minimum,critical,synergies,
 districts:r.districts.map(({name,pop,values,score,critical})=>({name,pop,values,score,critical}))};}
export function calculateScenario(choices,{years=2}={}){
 if(years!==2)throw new Error('HORIZON_UNSUPPORTED: для этого срока нет проверенной модели.');
 const errors=validateChoices(choices);if(errors.length)throw new Error('INVALID_SCENARIO: '+errors.join(' '));
 const clean=canonicalChoices(choices);
 return {contractVersion:'1',scenarioId:MODEL_VERSION+':'+hash({dataHash,choices:clean}),choices:clean,
 baseline:snapshot(simulate([])),result:snapshot(evaluate(clean))};
}
export function verifyScenario(payload){
 try {
  const calculated=calculateScenario(payload?.choices);
  for(const k of ['contractVersion','scenarioId','baseline','result']){
   if(!isDeepStrictEqual(payload[k],calculated[k]))return ['SCENARIO_MISMATCH: '+k+' не соответствует серверному расчёту.'];
  }
  return [];
 }catch{return ['INVALID_SCENARIO: невозможно проверить решения.'];}
}
export function compareScenarios(leftChoices,rightChoices){
 const left=calculateScenario(leftChoices),right=calculateScenario(rightChoices);
 const key=c=>c.id+':'+(c.district??'city');
 return {left,right,delta:Object.fromEntries(['cost','score','average','minimum','critical'].map(k=>[k,right.result[k]-left.result[k]])),
 removed:left.choices.filter(c=>!right.choices.some(x=>key(x)===key(c))),
 added:right.choices.filter(c=>!left.choices.some(x=>key(x)===key(c))),
 metrics:districts.flatMap((d,i)=>indicators.map(m=>({district:d.name,indicator:m.id,name:m.name,
 before:left.result.districts[i].values[m.id],after:right.result.districts[i].values[m.id],
 delta:right.result.districts[i].values[m.id]-left.result.districts[i].values[m.id]})))};
}
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
export function buildFacts(s){
 if(verifyScenario(s).length)throw new Error('SCENARIO_MISMATCH');
 const r=s.result,b=s.baseline,source=MODEL_INFO.source;
 const facts=[
 {id:'result.cost',value:r.cost,unit:'условные единицы',polarity:'neutral',text:'Расход '+r.cost+' из 100 единиц. Остаток '+(100-r.cost)+'.'},
 {id:'result.score',value:r.score,unit:'баллы модели',polarity:r.score>=b.score?'positive':'negative',text:'Score: '+fmt(b.score)+' → '+fmt(r.score)+'.'},
 {id:'result.critical',value:r.critical,unit:'показатели',polarity:r.critical===0?'positive':'negative',text:'Критических показателей ниже 40: '+r.critical+'. Отсутствие критических значений не означает отсутствие всех проблем.'},
 {id:'result.minimum',value:r.minimum,unit:'баллы модели',polarity:'neutral',text:'Минимальный районный балл '+fmt(r.minimum)+': '+r.districts.filter(d=>Math.abs(d.score-r.minimum)<1e-10).map(d=>d.name).join(', ')+'.'},
 ];
 for(let i=0;i<districts.length;i++)for(const m of indicators){
  const before=b.districts[i].values[m.id],after=r.districts[i].values[m.id];
  facts.push({id:'district.'+i+'.'+m.id,value:after,before,delta:after-before,unit:'баллы модели',
   polarity:after<before?'negative':after>before?'positive':'neutral',
   text:districts[i].name+' · '+m.name+': '+fmt(before)+' → '+fmt(after)+'.'+(after<40?' Ниже критического порога.':'')});
 }
 for(let i=0;i<r.synergies.length;i++){const x=r.synergies[i];facts.push({id:'synergy.'+i,value:x.bonus,unit:'баллы показателя',polarity:'positive',text:x.pair+': синергия +'+x.bonus+' к '+x.indicator+' в районе '+x.district+'; без уменьшения на лаг.'});}
 return facts.map(f=>({...f,source,scenarioId:s.scenarioId}));
}
