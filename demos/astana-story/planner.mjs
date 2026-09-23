import {validate} from '../../docs/brief-analysis/dist/model.mjs';
import {baseline,districts,indicators,measures} from './comparison.mjs';

const catalog=new Map(measures.map(m=>[m.id,m]));

export function readLinkedPlan(search){
 const raw=new URLSearchParams(search).get('plan');
 if(raw===null)return {choices:null,error:null};
 try{
  const choices=JSON.parse(raw);
  if(!Array.isArray(choices)||choices.some(c=>!c||typeof c!=='object'||Object.keys(c).some(k=>!['id','district'].includes(k))))return {choices:null,error:'План в ссылке содержит неподдерживаемые данные.'};
  const errors=validate(choices);
  return errors.length?{choices:null,error:errors.join(' ')}:{choices:choices.map(c=>({...c})),error:null};
 }catch{return {choices:null,error:'Не удалось прочитать план из ссылки. Соберите свой план или откройте пример.'};}
}

export function inspectDraft(choices){
 const errors=validate(choices,{allowIncomplete:true});
 const list=Array.isArray(choices)?choices:[];
 let cost=0;const directions={};
 for(const choice of list){const measure=catalog.get(choice?.id);if(!measure)continue;cost+=measure.cost;directions[measure.group]=(directions[measure.group]??0)+1;}
 const complete=list.length===5;
 return {errors,cost,remaining:100-cost,directions,complete,canCalculate:complete&&errors.length===0};
}

export function proposeChoice(choices,id,district,replaceIndex=null){
 const measure=catalog.get(id);
 if(!measure)throw new RangeError('Неизвестная мера '+id);
 if(replaceIndex!==null&&(!Number.isInteger(replaceIndex)||replaceIndex<0||replaceIndex>=choices.length))throw new RangeError('Неверный номер заменяемого решения.');
 const choice=measure.type==='city'?{id}:{id,district};
 const next=choices.map(c=>({...c}));
 if(replaceIndex===null)next.push(choice);else next[replaceIndex]=choice;
 const state=inspectDraft(next);
 return {choices:next,choice,cost:state.cost,remaining:state.remaining,errors:state.errors,allowed:state.errors.length===0};
}

export function buildDistrictMatrix(names,result=baseline){
 if(!Array.isArray(names)||names.length<1||names.length>5||new Set(names).size!==names.length||names.some(name=>!districts.some(d=>d.name===name)))throw new RangeError('Выберите от одного до пяти различных районов из датасета.');
 const columns=names.map(name=>{
  const before=baseline.districts.find(d=>d.name===name),after=result.districts.find(d=>d.name===name);
  return {name,populationShare:before.pop,scoreBefore:before.score,scoreAfter:after.score,criticalBefore:before.critical.length,criticalAfter:after.critical.length};
 });
 return {districts:columns,rows:indicators.map(indicator=>({id:indicator.id,name:indicator.name,category:indicator.id[0],values:names.map(name=>{
  const before=baseline.districts.find(d=>d.name===name).values[indicator.id],after=result.districts.find(d=>d.name===name).values[indicator.id];
  return {district:name,before,after,delta:after-before,critical:after<40};
 })}))};
}

export function realizedEffects(id){
 const measure=catalog.get(id);if(!measure)throw new RangeError('Неизвестная мера '+id);
 return Object.entries(measure.effects).map(([key,effect])=>({id:key,delta:effect*(8-measure.lag)/8}));
}
