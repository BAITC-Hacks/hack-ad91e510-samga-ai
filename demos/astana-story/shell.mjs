// Иконки, часы и переключение темы адаптированы из заготовки «Сайт».
const paths = {
 layout:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
 plan:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
 compare:'<path d="M5 20V10m7 10V4m7 16v-8M2 20h20"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>',pause:'<path d="M8 4v16M16 4v16"/>',
 next:'<path d="m8 5 7 7-7 7M20 5v14"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 back:'<path d="m15 5-7 7 7 7"/>',reset:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
 moon:'<path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
 exit:'<path d="M9 4H4v16h5m5-13 5 5-5 5M8 12h11"/>',
 budget:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-7 4h7v4h-7v-4Zm-8-8V3h12v2"/>',
 activity:'<path d="M2 12h4l3-8 6 16 3-8h4"/>',
 warning:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3v.1"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
 layers:'<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>'
};
export function icon(name){
 if(!paths[name])throw new Error('Неизвестная иконка: '+name);
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
}
export function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
function updateTheme(){
 const dark=document.documentElement.dataset.theme==='dark';
 for(const button of document.querySelectorAll('[data-theme-toggle]')){
  button.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');
  button.innerHTML=icon(dark?'sun':'moon');
 }
}
paintIcons();updateTheme();
for(const button of document.querySelectorAll('[data-theme-toggle]'))button.onclick=()=>{
 const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;
 try{localStorage.setItem('site-starter-theme',theme);}catch(error){console.warn('Тема не сохранена.',error);}
 updateTheme();document.dispatchEvent(new Event('panel-theme-change'));
};
const clock=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short',timeZone:'Asia/Almaty'});
function updateClock(){const now=new Date();for(const el of document.querySelectorAll('[data-clock]')){el.textContent=clock.format(now);el.dateTime=now.toISOString();}}
updateClock();setInterval(updateClock,30000);
for(const link of document.querySelectorAll('.nav-link'))link.onclick=()=>{
 for(const item of document.querySelectorAll('.nav-link')){item.classList.toggle('is-active',item===link);item.removeAttribute('aria-current');}
 link.setAttribute('aria-current','location');
};
