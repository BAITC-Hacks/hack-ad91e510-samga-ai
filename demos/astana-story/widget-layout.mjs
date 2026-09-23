// Адаптация существующего widget-layout.js из заготовки «Сайт» (GridStack 12.6).
const host=document.querySelector('#dashboard-grid');
const status=document.querySelector('#layout-status');
const storageKey='astana-panel-layout-v1';
const defaults=[...host.children].map(el=>Object.fromEntries(['id','x','y','w','h'].map(key=>[key,key==='id'?el.getAttribute('gs-id'):Number(el.getAttribute('gs-'+key))])));
let saved=null;
try{
 const raw=localStorage.getItem(storageKey);
 if(raw){
  const values=JSON.parse(raw);
  const valid=Array.isArray(values)&&values.length===defaults.length&&defaults.every(d=>values.filter(v=>v?.id===d.id).length===1)&&values.every(v=>{
   const d=defaults.find(d=>d.id===v.id);
   return d&&Number.isInteger(v.x)&&v.x>=0&&v.x+d.w<=12&&Number.isInteger(v.y)&&v.y>=0&&v.y<100;
  });
  if(!valid)throw new Error('Некорректная раскладка');
  saved=values.map(v=>({...defaults.find(d=>d.id===v.id),x:v.x,y:v.y}));
 }
}catch(error){console.warn('Используется исходная раскладка панели.',error);status.textContent='Исходная раскладка';}
const grid=window.GridStack.init({column:12,cellHeight:48,margin:7,float:false,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,disableResize:true,draggable:{handle:'.card__heading'}},host);
if(saved)grid.load(saved,false);
const notify=()=>requestAnimationFrame(()=>window.dispatchEvent(new Event('panel-layout-change')));
grid.on('dragstop',()=>{
 const positions=grid.getGridItems().map(el=>({id:el.gridstackNode.id,x:el.gridstackNode.x,y:el.gridstackNode.y}));
 try{localStorage.setItem(storageKey,JSON.stringify(positions));status.textContent='Раскладка сохранена';}
 catch(error){console.warn('Не удалось сохранить раскладку.',error);status.textContent='Раскладка не сохранена';}
 notify();
});
document.querySelector('#reset-layout').onclick=()=>{
 grid.load(defaults.map(d=>({...d})),false);
 try{localStorage.removeItem(storageKey);status.textContent='Исходная раскладка восстановлена';}
 catch(error){console.warn('Не удалось очистить сохранённую раскладку.',error);status.textContent='Восстановлено до перезагрузки';}
 notify();
};
notify();
