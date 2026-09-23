import {districts,measures} from '../docs/brief-analysis/dist/data.mjs';
import {evaluate} from '../docs/brief-analysis/dist/model.mjs';
import {calculateScenario,validateChoices} from './scenarios.mjs';
export const OBJECTIVES=['score','cost','weakest','air'];
function invalid(){throw new Error('INVALID_CONSTRAINTS: проверьте цель, бюджет, обязательные и исключённые меры.');}
export function normalizeConstraints(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))invalid();
 if(Object.keys(input).some(k=>!['objective','maxBudget','required','excluded','criticalLimit'].includes(k)))invalid();
 const c={objective:'score',maxBudget:100,required:[],excluded:[],criticalLimit:null,...input};
 if(!OBJECTIVES.includes(c.objective)||!Number.isFinite(c.maxBudget)||c.maxBudget<0||c.maxBudget>100)invalid();
 if(c.criticalLimit!==null&&(!Number.isInteger(c.criticalLimit)||c.criticalLimit<0||c.criticalLimit>50))invalid();
 if(!Array.isArray(c.required)||c.required.length>5||validateChoices(c.required,{partial:true}).length)invalid();
 if(!Array.isArray(c.excluded)||c.excluded.length>14||new Set(c.excluded).size!==c.excluded.length||
 c.excluded.some(id=>!measures.some(m=>m.id===id))||c.required.some(x=>c.excluded.includes(x.id)))invalid();
 return c;
}
export function optimizePlans(input={}){
 const constraints=normalizeConstraints(input),{objective,maxBudget,required,excluded,criticalLimit}=constraints;
 const pool=measures.filter(m=>!excluded.includes(m.id)),requiredMap=new Map(required.map(c=>[c.id,c]));
 let validCount=0,eligibleCount=0,best=null,bestChoices=null,bestRank=null,visitedSets=0;
 const rank=r=>{
  const air=r.districts.reduce((sum,d)=>sum+d.pop*d.values.E2,0);
  return objective==='cost'?[-r.cost,r.score]:objective==='weakest'?[r.minimum,r.score,-r.cost]:
   objective==='air'?[air,r.score,-r.cost]:[r.score,-r.cost];
 };
 function better(a,b){if(!b)return true;for(let i=0;i<a.length;i++){if(Math.abs(a[i]-b[i])>1e-10)return a[i]>b[i];}return false;}
 function assign(set,index,choices){
  if(index===set.length){
   const r=evaluate(choices);if(r.errors.length)return;validCount++;
   if(criticalLimit!==null&&r.critical>criticalLimit)return;eligibleCount++;
   const candidateRank=rank(r);
   if(better(candidateRank,bestRank)){best=r;bestRank=candidateRank;bestChoices=choices.map(c=>({...c}));}
   return;
  }
  const m=set[index],locked=requiredMap.get(m.id);
  if(m.type==='city')return assign(set,index+1,[...choices,{id:m.id}]);
  for(const d of (locked?[locked.district]:districts.map(d=>d.name))){
   if((m.id==='M7'&&choices.some(c=>c.id==='M4'&&c.district===d))||
      (m.id==='M13'&&choices.some(c=>c.id==='M5'&&c.district===d)))continue;
   assign(set,index+1,[...choices,{id:m.id,district:d}]);
  }
 }
 function combinations(start,set,cost,counts){
  if(set.length===5){
   if(required.some(c=>!set.some(m=>m.id===c.id)))return;
   visitedSets++;assign(set,0,[]);return;
  }
  for(let i=start;i<=pool.length-(5-set.length);i++){
   const m=pool[i];if(cost+m.cost>maxBudget||(counts[m.group]??0)>=2)continue;
   if(m.id==='M3'&&set.some(x=>x.id==='M1'))continue;
   combinations(i+1,[...set,m],cost+m.cost,{...counts,[m.group]:(counts[m.group]??0)+1});
  }
 }
 combinations(0,[],0,{});
 return {constraints,status:best?'optimal':'infeasible',search:'exhaustive',validCount,eligibleCount,visitedSets,
  scope:'DOCX, 8 кварталов; оптимальность только для выбранной цели и ограничений',
  scenario:best?calculateScenario(bestChoices):null};
}
