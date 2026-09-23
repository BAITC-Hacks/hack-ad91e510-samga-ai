export function createBriefingSession({request,onChange=()=>{}}){
 const state={choices:[],comparisonChoices:undefined,brief:null,html:null,search:null,busy:false,error:'',title:'Помочь там, где проблемы острее'};
 let revision=0;
 const changed=()=>onChange(state);
 async function refresh(version){
  state.brief=null;state.html=null;changed();
  try{
   const r=await request('/api/brief',{choices:state.choices,comparisonChoices:state.comparisonChoices,title:state.title});
   if(version===revision){state.brief=r.brief;state.html=r.html;}
  }catch(e){if(version===revision)state.error=e.message;}
  finally{if(version===revision){state.busy=false;changed();}}
 }
 return {state,
  async select(choices,{title=state.title,comparisonChoices=state.comparisonChoices}={}){
   const version=++revision;
   Object.assign(state,{choices,comparisonChoices,title,search:null,error:'',busy:true});
   await refresh(version);
  },
  async compare(choices){
   const version=++revision;Object.assign(state,{comparisonChoices:choices,error:'',busy:true});
   await refresh(version);
  },
  async search(constraints){
   const version=++revision;Object.assign(state,{busy:true,error:'',search:null});changed();
   try{
    const r=await request('/api/search',constraints);
    if(version!==revision)return;
    if(r.search!=='exhaustive'||!['optimal','infeasible'].includes(r.status))throw new Error('Поиск не подтвердил полный перебор. Предыдущий план сохранён.');
    if(r.status==='infeasible'){
     state.search=r;
     state.error='При этих условиях допустимого плана нет. На экране сохранён предыдущий расчёт. Измените бюджет или ограничения.';
     return;
    }
    if(!r.scenario)throw new Error('Поиск не подтвердил оптимальный результат. Попробуйте ещё раз.');
    state.search=r;
    state.choices=r.scenario.choices;
    state.title={score:'Максимальный общий результат',cost:'Меньше расходов при заданных условиях',weakest:'Приоритет слабейшему району',air:'Приоритет качеству воздуха'}[r.constraints.objective];
    await refresh(version);
   }catch(e){if(version===revision)state.error=e.message;}
   finally{if(version===revision){state.busy=false;changed();}}
  }
 };
}
