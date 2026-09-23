const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const codes = {Есиль:'KZ711210',Алматы:'KZ711110',Сарыарка:'KZ711310',Байконур:'KZ711410',Нура:'KZ711510'};
// Демонстрационные точки, не адреса утверждённых городских проектов.
const points = [[71.402,51.125],[71.412,51.181],[71.395,51.121],[71.400,51.118],[71.443,51.140]];
const overview = {center:[71.418,51.15],zoom:12.7,pitch:48,bearing:-25};
const cityView = {center:[71.433,51.1305],zoom:14.7,pitch:58,bearing:-28};

export async function createStoryMap({projects,titles,icons,onStatus}) {
  let map,ready=false,markers=[],frame,viewStep=-1;
  function camera(options) {
    if(map) map.flyTo({...options,duration:reducedMotion?0:1500});
  }
  function present(nextFrame) {
    frame=nextFrame;
    if(!ready)return;
    markers.forEach((marker,i)=>{
      const visible=i<frame.selectedCount;
      const element=marker.getElement();
      element.hidden=!visible;
      element.className=`project-pin ${frame.projectStates[i]} ${frame.phase==='planning'&&i===frame.step-1?'focused':''}`;
      const status=frame.projectStates[i]==='building'?'Работы идут':frame.projectStates[i]==='active'?'Даёт эффект':'Включено в план';
      element.querySelector('small').textContent=`${projects[i].district??'Весь город'} · ${status}`;
    });
    const focus=frame.phase==='planning'?projects[frame.step-1].district:null;
    map.setFilter('district-selected',['==',['get','ADM2_PCODE'],codes[focus]??'none']);
    map.setPaintProperty('district-fill','fill-opacity',frame.phase==='result'?.10:.045);
    if(frame.step!==viewStep){
      viewStep=frame.step;
      if(frame.phase==='planning') {
        const center=points[frame.step-1];
        const mobile=innerWidth<=650;
        camera({center,zoom:frame.step===5?12.9:14.05,pitch:55,bearing:-24,padding:mobile?{top:70,bottom:Math.max(0,innerHeight-300),left:5,right:5}:{left:Math.min(390,innerWidth*.29),right:Math.min(315,innerWidth*.25),top:60,bottom:235}});
      } else if(['intro','ready','result'].includes(frame.phase)||frame.quarter===1) {
        camera({...frame.phase==='intro'?cityView:overview,padding:innerWidth<=650?{top:70,bottom:Math.max(0,innerHeight-300),left:0,right:0}:{top:60,bottom:220,left:100,right:50}});
      }
    }
  }
  try{
    if(!window.maplibregl)throw new Error('Не загрузилась библиотека карты.');
    const responses=await Promise.all([fetch('../astana-city/base-style.json'),fetch('../astana-city/astana.geojson')]);
    if(responses.some(r=>!r.ok))throw new Error('Не удалось загрузить геометрию карты.');
    const [style,geo]=await Promise.all(responses.map(r=>r.json()));
    const colors={background:['background-color','#101f29'],water:['fill-color','#123c4b'],landuse_residential:['fill-color','#192a34'],landuse_park:['fill-color','#234039'],landcover_wood:['fill-color','#1f3532'],building:['fill-color','#2a424d'],highway_minor:['line-color','#2b404b'],highway_major_inner:['line-color','#3d555f']};
    for(const layer of style.layers){
      if(colors[layer.id]){const [property,color]=colors[layer.id];layer.paint={...layer.paint,[property]:color};delete layer.paint['fill-pattern'];}
      if(layer.type==='symbol'){
        if(layer['source-layer']==='place'||layer['source-layer']==='transportation')layer.layout={...layer.layout,visibility:'none'};
        else if(layer.layout?.['text-field']){
          if(layer['source-layer']==='transportation_name')layer.minzoom=16;
          layer.layout['text-field']=['coalesce',['get','name:ru'],['get','name']];
          layer.paint={...layer.paint,'text-color':'#8fa7b3','text-halo-color':'#122630','text-halo-width':1};
        }
      }
    }
    map=new maplibregl.Map({container:'map',style,...cityView,maxPitch:68,minZoom:9,maxZoom:18,canvasContextAttributes:{antialias:true},attributionControl:false});
    map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
    map.on('error',event=>{console.warn('Map resource:',event.error?.message);onStatus('Карта загружается не полностью. Демо и расчёты доступны.',true);});
    map.on('load',()=>{
      const firstSymbol='highway_name_other';
      map.addSource('districts',{type:'geojson',data:geo});
      map.addLayer({id:'district-fill',type:'fill',source:'districts',paint:{'fill-color':'#8cbaae','fill-opacity':.045}},firstSymbol);
      map.addLayer({id:'district-outline',type:'line',source:'districts',paint:{'line-color':'#7facae','line-opacity':.3,'line-width':1,'line-dasharray':[3,3]}},firstSymbol);
      map.addLayer({id:'district-selected',type:'line',source:'districts',filter:['==',['get','ADM2_PCODE'],'none'],paint:{'line-color':'#d8f391','line-opacity':.65,'line-width':1.6}},firstSymbol);
      map.addLayer({id:'city-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:12,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],8],0,'#334e5b',25,'#52757f',65,'#769b9e',140,'#b9d1c3'],'fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.96,'fill-extrusion-vertical-gradient':true}},firstSymbol);
      map.setLight({anchor:'viewport',color:'#e0ede7',intensity:.48,position:[1.5,190,45]});
      for(const [name,coordinates] of [['Байтерек',[71.4305,51.1283]],['Хан Шатыр',[71.4038,51.1324]],['Акорда',[71.446,51.1257]]]){
        const element=document.createElement('div');element.className='landmark';element.innerHTML=`<div class="landmark-label">${name}</div><div class="landmark-stem"></div><div class="landmark-point"></div>`;
        new maplibregl.Marker({element,anchor:'bottom'}).setLngLat(coordinates).addTo(map);
      }
      markers=projects.map((p,i)=>{
        const element=document.createElement('div');element.className='project-pin';element.hidden=true;
        element.innerHTML=`<div class="pin-label">${icons[i]}<div><b>${titles[i]}</b><small></small></div></div><div class="pin-stem"></div><div class="pin-base"></div>`;
        return new maplibregl.Marker({element,anchor:'bottom'}).setLngLat(points[i]).addTo(map);
      });
      ready=true;if(frame)present(frame);
      map.once('idle',()=>onStatus(''));
    });
    document.getElementById('overview').onclick=()=>camera({...overview,padding:{top:70,bottom:230,left:0,right:0}});
    document.getElementById('zoom-in').onclick=()=>map.zoomIn({duration:reducedMotion?0:300});
    document.getElementById('zoom-out').onclick=()=>map.zoomOut({duration:reducedMotion?0:300});
    document.getElementById('tilt').onclick=()=>camera({pitch:map.getPitch()<20?55:0,bearing:map.getPitch()<20?-25:0});
    map.on('pitchend',()=>{const button=document.getElementById('tilt');button.textContent=map.getPitch()>20?'3D':'2D';button.setAttribute('aria-pressed',String(map.getPitch()>20));});
  }catch(error){console.error(error);onStatus(`${error.message} Сценарий можно пройти без карты.`,true);}
  return {present};
}
