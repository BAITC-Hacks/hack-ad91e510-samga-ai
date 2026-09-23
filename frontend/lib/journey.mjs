import { selectionReason, spentBudget } from './scenario.mjs';
import { relevantChoices } from './district-insights.mjs';

export const problemTitles = {
  T1:'Заторы на дорогах',T2:'Доступность общественного транспорта',
  E1:'Недостаток зелёных зон',E2:'Качество воздуха',
  S1:'Нехватка школ и детсадов',S2:'Доступность медицины',
  B1:'Безопасность улиц',B2:'Безопасность на дорогах',
  C1:'Надёжность коммунальных сетей',C2:'Работа с обращениями жителей'
};

// Feasibility only: protect the five-decision budget, never calculate a Score.
export function canFinishPlan(choices,data) {
  if(choices.length===5)return true;
  if(choices.length>5)return false;
  const available=data.measures.filter(m=>!selectionReason(choices,m,data.measures)).sort((a,b)=>a.cost-b.cost);
  const slots=5-choices.length;
  if(available.length<slots||spentBudget(choices,data.measures)+available.slice(0,slots).reduce((n,m)=>n+m.cost,0)>100)return false;
  for(const m of available){
    for(const district of m.type==='city'?[undefined]:data.districts.map(d=>d.name)){
      if(selectionReason(choices,m,data.measures,district))continue;
      const next=m.type==='city'?{id:m.id}:{id:m.id,district};
      if(canFinishPlan([...choices,next],data))return true;
    }
  }
  return false;
}
export function guidedReason(state,measure,district) {
  const reason=selectionReason(state.choices,measure,state.data.measures,district);
  if(reason)return reason;
  const choice=measure.type==='city'?{id:measure.id}:{id:measure.id,district};
  return canFinishPlan([...state.choices,choice],state.data)?'':'Не хватит бюджета на все пять решений';
}
export function journeyProblems(state,filter='all') {
  return state.data.baseline.districts.flatMap(d=>state.data.indicators.filter(i=>d.values[i.id]<60).map(i=>{
    const measures=state.data.measures.filter(m=>m.effects[i.id]>0);
    return {district:d.name,id:i.id,name:i.name,title:problemTitles[i.id],value:d.values[i.id],planned:relevantChoices(state,d.name,i.id).length,available:measures.some(m=>!guidedReason(state,m,d.name))};
  })).filter(p=>filter==='all'||p.district===filter).sort((a,b)=>Number(b.available)-Number(a.available)||a.planned-b.planned||a.value-b.value);
}
export function selectedProblem(state) {
  return journeyProblems(state).find(p=>p.district===state.guideDistrict&&p.id===state.guideIssue)??journeyProblems(state)[0];
}
export function outcomeFacts(state) {
  if(!state.result)return null;
  const changed=state.result.districts.map(d=>({...d,delta:d.score-state.data.baseline.districts.find(b=>b.name===d.name).score}));
  const best=[...changed].sort((a,b)=>b.delta-a.delta)[0];
  const weakest=changed.flatMap(d=>state.data.indicators.map(i=>({district:d.name,name:i.name,value:d.values[i.id]}))).sort((a,b)=>a.value-b.value)[0];
  return {best,weakest,improved:changed.filter(d=>d.delta>1e-8).length};
}
