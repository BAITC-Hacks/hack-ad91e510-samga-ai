import { scenarios, measures } from '../../docs/brief-analysis/dist/data.mjs';
import { simulate, evaluate } from '../../docs/brief-analysis/dist/model.mjs';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const baseline = simulate([]);
const choices = scenarios.find(s => s.id === 'coverage').choices;
const result = evaluate(choices);
if (result.errors.length) throw new Error(result.errors.join('; '));
const codes = {Есиль:'KZ711210',Алматы:'KZ711110',Сарыарка:'KZ711310',Байконур:'KZ711410',Нура:'KZ711510',Сарайшық:'KZ711610'};
const viewpoints = {Есиль:[71.433,51.126],Алматы:[71.479,51.157],Сарыарка:[71.408,51.182],Байконур:[71.447,51.192],Нура:[71.395,51.125],Сарайшық:[71.511,51.117]};
const metricKeys = [['T2','Транспорт'],['E1','Озеленение'],['S1','Образование']];
let mode = 'before', selected = 'Есиль', activeLayer = 'city', mapReady = false;
let map, districtGeo;
const number = n => n.toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1});
const current = () => mode === 'before' ? baseline : result;

function render(){
  const data = current();
  $('city-score').textContent = number(data.score);
  $('score-delta').textContent = mode === 'before' ? 'Исходное состояние' : `+${number(result.score - baseline.score)} к индексу`;
  $('score-track').style.width = `${data.score}%`;
  for (const id of ['before','after']) {$(id).classList.toggle('active',mode===id);$(id).setAttribute('aria-pressed',String(mode===id));}
  $('districts').replaceChildren(...[...data.districts,{name:'Сарайшық',score:null}].map(d=>{
    const button=document.createElement('button');button.className=`district ${selected===d.name?'selected':''}`;
    button.setAttribute('aria-pressed',String(selected===d.name));
    button.innerHTML=`<i></i><span>${d.name}</span><strong>${d.score===null?'—':number(d.score)}</strong><span class="mini-bar"><span style="width:${d.score??0}%"></span></span>`;
    button.addEventListener('click',()=>selectDistrict(d.name));return button;
  }));
  const d=data.districts.find(d=>d.name===selected), b=baseline.districts.find(d=>d.name===selected);
  $('district-name').textContent=selected;
  $('district-change').textContent=d&&mode==='after'?`+${number(d.score-b.score)} к индексу`:'Выбранный район';
  $('district-profile').textContent=d?.profile??'Для этого района нет показателей в учебном датасете.';
  $('metrics').innerHTML=d?metricKeys.map(([key,label])=>`<div class="metric"><span>${label}</span><span class="metric-bar"><i style="width:${d.values[key]}%"></i></span><b>${Math.round(d.values[key])}</b></div>`).join(''):'';
  $('apply').innerHTML=mode==='before'?'Показать результат <span>↗</span>':'Вернуться к исходному <span>↶</span>';
  if(mapReady) updateDistricts();
}
const icons=['↗','♧','▤','◉','⌘'];
const titles=['Автобусные полосы','Новый парк','Школа и детсад','Свет и камеры','Бригады ЖКХ'];
$('decisions').innerHTML=choices.map((c,i)=>{const m=measures.find(m=>m.id===c.id);return `<div class="decision"><span class="decision-icon">${icons[i]}</span><span class="decision-name">${titles[i]}</span><span class="decision-district">${c.district??'Весь город'} <span class="decision-price">· ${m.cost}</span></span></div>`;}).join('');
$('budget').innerHTML=`${result.cost} <small>/ 100</small>`;
$('budget-rest').textContent=`${100-result.cost} ед. в резерве`;
document.querySelector('.budget-track i').style.width=`${result.cost}%`;
function setMode(value){mode=value;render();}
$('before').onclick=()=>setMode('before');$('after').onclick=()=>setMode('after');$('apply').onclick=()=>setMode(mode==='before'?'after':'before');
render();

function fly(options){map?.flyTo({...options,duration:reducedMotion?0:1400});}
function selectDistrict(name){selected=name;render();if(mapReady)fly({center:viewpoints[name],zoom:14.35,pitch:55,bearing:-24});}
function updateDistricts(){
  const scores=new Map(current().districts.map(d=>[codes[d.name],d.score]));
  const expression=['match',['get','ADM2_PCODE']];
  for(const [code,score] of scores)expression.push(code,score<50?'#ddaf79':score<60?'#76b6ae':'#c7e78b');
  expression.push('#74838e');
  map.setPaintProperty('district-fill','fill-color',expression);
  map.setPaintProperty('district-fill','fill-opacity',activeLayer==='districts'?.22:mode==='after'?.075:.025);
  map.setFilter('district-selected',['==',['get','ADM2_PCODE'],codes[selected]]);
}
function setLayer(layer){
  activeLayer=layer;
  for(const button of document.querySelectorAll('[data-layer]')){const active=button.dataset.layer===layer;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  if(!mapReady)return;
  map.setPaintProperty('landuse_park','fill-color',layer==='green'?'#659d72':'#234039');
  map.setPaintProperty('landcover_wood','fill-color',layer==='green'?'#547e60':'#1f3532');
  map.setPaintProperty('city-buildings','fill-extrusion-opacity',layer==='green'?.45:.96);
  updateDistricts();
  if(layer==='districts')fly({center:[71.45,51.155],zoom:11.25,pitch:25,bearing:-10});
  else fly({center:[71.433,51.134],zoom:14.7,pitch:58,bearing:-28});
}
for(const button of document.querySelectorAll('[data-layer]'))button.onclick=()=>setLayer(button.dataset.layer);

function status(message,error=false){$('map-status').textContent=message;$('map-status').className=`map-status${error?' error':''}`;}
async function init(){
  try{
    if(!window.maplibregl)throw new Error('Не загрузилась библиотека карты.');
    const responses=await Promise.all([fetch('./base-style.json'),fetch('./astana.geojson')]);
    if(responses.some(r=>!r.ok))throw new Error('Не удалось загрузить локальную геометрию.');
    const [style,geo]=await Promise.all(responses.map(r=>r.json()));districtGeo=geo;
    for(const layer of style.layers){
      if(layer.id==='background')layer.paint['background-color']='#101f29';
      if(layer.id==='water')layer.paint['fill-color']='#123c4b';
      if(layer.id==='landuse_residential')layer.paint['fill-color']='#192a34';
      if(layer.id==='landuse_park')layer.paint['fill-color']='#234039';
      if(layer.id==='landcover_wood')layer.paint['fill-color']='#1f3532';
      if(layer.id==='building')layer.paint['fill-color']='#2a424d';
      if(layer.id==='highway_minor')layer.paint['line-color']='#2b404b';
      if(layer.id==='highway_major_inner')layer.paint['line-color']='#3d555f';
      if(layer.type==='symbol'){
        if(layer['source-layer']==='place'||layer['source-layer']==='transportation')layer.layout={...layer.layout,visibility:'none'};
        else if(layer.layout?.['text-field']){
          if(layer['source-layer']==='transportation_name')layer.minzoom=16;
          layer.layout['text-field']=['coalesce',['get','name:ru'],['get','name']];
          layer.paint={...layer.paint,'text-color':'#8fa7b3','text-halo-color':'#122630','text-halo-width':1};
        }
      }
    }
    map=new maplibregl.Map({container:'map',style,center:[71.433,51.1305],zoom:14.7,pitch:58,bearing:-28,maxPitch:68,minZoom:9,maxZoom:18,canvasContextAttributes:{antialias:true},attributionControl:false});
    map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
    map.on('error',e=>{console.warn('Map resource:',e.error?.message);status('Часть карты не загрузилась. Проверьте подключение к интернету.',true);});
    map.on('moveend',()=>{const c=map.getCenter();$('coords').textContent=`${c.lat.toFixed(4)}° N   ${c.lng.toFixed(4)}° E`;});
    map.on('load',()=>{
      const firstSymbol='highway_name_other';
      map.addSource('districts',{type:'geojson',data:districtGeo});
      map.addLayer({id:'district-fill',type:'fill',source:'districts',paint:{'fill-color':'#a4c5b9','fill-opacity':.025}},firstSymbol);
      map.addLayer({id:'district-outline',type:'line',source:'districts',paint:{'line-color':'#7facae','line-opacity':.3,'line-width':1,'line-dasharray':[3,3]}},firstSymbol);
      map.addLayer({id:'district-selected',type:'line',source:'districts',paint:{'line-color':'#d8f391','line-opacity':.65,'line-width':1.5}},firstSymbol);
      map.addLayer({id:'city-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:12,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],8],0,'#334e5b',25,'#52757f',65,'#769b9e',140,'#b9d1c3'],'fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},firstSymbol);
      map.setLight({anchor:'viewport',color:'#e0ede7',intensity:.48,position:[1.5,190,45]});
      for(const [name,subtitle,coordinates] of [['Байтерек','СЕРДЦЕ СТОЛИЦЫ',[71.4305,51.1283]],['Хан Шатыр','ГОРОДСКОЙ ОРИЕНТИР',[71.4038,51.1324]],['Акорда','ЛЕВЫЙ БЕРЕГ',[71.446,51.1257]]]){
        const element=document.createElement('div');element.className='landmark';element.innerHTML=`<div class="landmark-label"><b>${name}</b><small>${subtitle}</small></div><div class="landmark-stem"></div><div class="landmark-point"></div>`;
        new maplibregl.Marker({element,anchor:'bottom'}).setLngLat(coordinates).addTo(map);
      }
      map.on('click','district-fill',event=>{const code=event.features?.[0]?.properties.ADM2_PCODE;const name=Object.keys(codes).find(n=>codes[n]===code);if(name)selectDistrict(name);});
      mapReady=true;window.cityDemo={map,baseline,result,getState:()=>({mode,selected,activeLayer})};updateDistricts();
      map.once('idle',()=>{$('map-status').className='map-status loaded';});
    });
    $('zoom-in').onclick=()=>map.zoomIn({duration:reducedMotion?0:300});$('zoom-out').onclick=()=>map.zoomOut({duration:reducedMotion?0:300});
    $('tilt').onclick=()=>{const is3d=map.getPitch()<20;fly({pitch:is3d?58:0,bearing:is3d?-28:0});};
    map.on('pitchend',()=>{$('tilt').textContent=map.getPitch()>20?'3D':'2D';$('tilt').setAttribute('aria-pressed',String(map.getPitch()>20));});
    $('home').onclick=()=>{selected='Есиль';render();setLayer('city');};$('overview').onclick=()=>setLayer('districts');
  }catch(error){status(error.message+' Откройте страницу через локальный сервер.',true);console.error(error);}
}
init();
