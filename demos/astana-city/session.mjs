import {selectionReason,spentBudget} from '../../frontend/lib/scenario.mjs';
import {validate} from '../../docs/brief-analysis/dist/model.mjs';

export async function apiRequest(path,body,{base='',fetchImpl=fetch}={}){
 let response;
 try{
  response=await fetchImpl(base+path,{method:body===undefined?'GET':'POST',
   headers:{'Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 }catch{throw new Error('Нет связи с сервером. Проверьте запуск и повторите запрос.');}
 let data;
 try{data=await response.json();}catch{throw new Error('Сервер вернул ответ в неизвестном формате.');}
 if(!response.ok)throw new Error(data.error?.message??'Не удалось выполнить запрос.');
 return data;
}

export function createPlannerSession({request=apiRequest,onChange=()=>{}}={}){
 const state={catalog:null,health:null,choices:[],spent:0,simulation:null,analysis:null,
  busy:false,aiBusy:false,error:'',aiError:''};
 let revision=0,calculation=0,analysis=0;
 const changed=()=>onChange(state);
 function invalidate(){
  revision++;state.spent=spentBudget(state.choices,state.catalog.measures);
  Object.assign(state,{simulation:null,analysis:null,error:'',aiError:'',busy:false,aiBusy:false});changed();
 }
 return {state,
  async load(){
   try{
    const [catalog,health]=await Promise.all([request('/api/catalog'),request('/api/health')]);
    if(!Number.isFinite(catalog.baseline?.score)||catalog.districts?.length!==5)throw new Error('Сервер не передал исходные показатели города.');
    Object.assign(state,{catalog,health,error:''});
   }catch(error){state.error=error.message;}
   changed();
  },
  reason(choice){
   if(!state.catalog)return 'Каталог ещё не загружен.';
   const m=state.catalog.measures.find(m=>m.id===choice.id);
   const reason=selectionReason(state.choices,m,state.catalog.measures,choice.district);
   if(reason)return reason;
   if(m.type==='district'&&!state.catalog.districts.some(d=>d.name===choice.district))return 'Выберите один из пяти районов.';
   if(m.type==='city'&&choice.district!==undefined)return 'Городская мера действует на весь город.';
   return '';
  },
  add(choice){
   const reason=this.reason(choice);
   if(reason){state.error=reason;changed();return false;}
   state.choices=[...state.choices,choice.district===undefined?{id:choice.id}:{id:choice.id,district:choice.district}];
   invalidate();return true;
  },
  remove(id){state.choices=state.choices.filter(c=>c.id!==id);invalidate();},
  clear(){state.choices=[];invalidate();},
  importChoices(choices){
   if(!state.catalog)return false;
   const malformed=!Array.isArray(choices)||choices.some(c=>!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['id','district'].includes(k)));
   const errors=malformed?['Ссылка содержит некорректный план.']:validate(choices);
   if(errors.length){state.error=errors.join(' ');changed();return false;}
   state.choices=choices.map(c=>c.district===undefined?{id:c.id}:{id:c.id,district:c.district});
   invalidate();return true;
  },
  async calculate(){
   const errors=validate(state.choices);
   if(errors.length){state.error=errors.join(' ');changed();return;}
   const version=revision,call=++calculation;
   Object.assign(state,{busy:true,error:'',analysis:null,aiError:''});changed();
   try{
    const result=await request('/api/simulate',{choices:state.choices});
    if(version!==revision||call!==calculation)return;
    if(result.contractVersion!=='1'||!Number.isFinite(result.result?.score))throw new Error('Ответ расчёта не соответствует контракту.');
    state.simulation=result;
   }catch(error){if(version===revision&&call===calculation)state.error=error.message;}
   finally{if(version===revision&&call===calculation){state.busy=false;changed();}}
  },
  async analyze(){
   if(!state.simulation)return;
   const version=revision,call=++analysis,simulation=state.simulation;
   Object.assign(state,{aiBusy:true,aiError:'',analysis:null});changed();
   try{
    const result=await request('/api/analyze',simulation);
    if(version!==revision||call!==analysis||simulation!==state.simulation)return;
    if(result.scenarioId!==simulation.scenarioId)throw new Error('AI ответил для другого плана. Повторите анализ.');
    state.analysis=result;
   }catch(error){if(version===revision&&call===analysis)state.aiError=error.message;}
   finally{if(version===revision&&call===analysis){state.aiBusy=false;changed();}}
  }
 };
}
