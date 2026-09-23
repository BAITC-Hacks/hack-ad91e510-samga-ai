const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const codes = {Есиль:'KZ711210',Алматы:'KZ711110',Сарыарка:'KZ711310',Байконур:'KZ711410',Нура:'KZ711510'};
// Точки служат для обзора районов, а не обозначают участки строительства.
const centers = {Есиль:[71.448,51.124],Алматы:[71.485,51.161],Сарыарка:[71.406,51.181],Байконур:[71.448,51.196],Нура:[71.392,51.125]};
const cityView = {center:[71.433,51.1305],zoom:14.7,pitch:58,bearing:-28};

export async function createComparisonMap({onSelect,onStatus}) {
  let map,ready=false,view=null,mode='city';
  const markers = new Map();
  const landmarks=[];
  function fitOverview(duration=900){
    map.fitBounds([[71.383,51.115],[71.495,51.203]],{padding:{top:28,right:35,bottom:48,left:35},pitch:20,bearing:-8,duration:reducedMotion?0:duration,maxZoom:13});
  }
  function setView(next){
    const unchanged=mode===next;
    mode=next;
    document.getElementById('city-view').setAttribute('aria-pressed',String(mode==='city'));
    document.getElementById('district-view').setAttribute('aria-pressed',String(mode==='districts'));
    if(!ready)return;
    if(view)present(view);
    if(unchanged)return;
    if(mode==='districts')fitOverview();
    else map.flyTo({...cityView,duration:reducedMotion?0:1000});
  }
  function present(next) {
    view=next;
    if(!ready)return;
    const color=['match',['get','ADM2_PCODE']];
    for(const district of view.data.districts){
      const count=view.choices.filter(c=>c.district===district.name).length;
      const critical=district.critical.length;
      color.push(codes[district.name],critical?'#ce846e':count?'#b9d68c':'#79969b');
      const marker=markers.get(district.name).getElement();
      marker.hidden=mode!=='districts';
      marker.classList.toggle('critical',critical>0);
      marker.classList.toggle('invested',count>0);
      marker.classList.toggle('selected',district.name===view.selected);
      marker.setAttribute('aria-pressed',String(district.name===view.selected));
      marker.setAttribute('aria-label',district.name+': '+count+' районных проектов, '+critical+' критических показателей');
      marker.querySelector('.allocation').textContent=count?(count===1?'1 проект':count+' проекта'):'';
      const warning=marker.querySelector('.marker-warning');
      warning.hidden=critical===0;
      warning.textContent=critical===1?'1 проблема':critical+' проблемы';
    }
    color.push('#719095');
    map.setPaintProperty('district-fill','fill-color',color);
    map.setPaintProperty('district-fill','fill-opacity',mode==='districts'?(view.before?.12:.18):0);
    map.setPaintProperty('district-outline','line-opacity',mode==='districts'?.35:0);
    map.setPaintProperty('district-selected','line-opacity',mode==='districts'?.8:0);
    landmarks.forEach(marker=>{marker.getElement().hidden=mode!=='city';});
    map.setFilter('district-selected',['==',['get','ADM2_PCODE'],codes[view.selected]]);
    const arrows=mode==='districts'&&view.scenarioId==='source'&&!view.before&&!view.custom
      ? ['Нура','Сарыарка'].map(name=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[centers.Есиль,centers[name]]}}))
      : [];
    map.getSource('reallocation').setData({type:'FeatureCollection',features:arrows});
  }
  try {
    if(!window.maplibregl)throw new Error('Библиотека карты недоступна.');
    const responses=await Promise.all([fetch(new URL('../astana-city/base-style.json',import.meta.url)),fetch(new URL('../astana-city/astana.geojson',import.meta.url))]);
    if(responses.some(r=>!r.ok))throw new Error('Не удалось загрузить основу карты.');
    const [style,geo]=await Promise.all(responses.map(r=>r.json()));
    const colors={background:['background-color','#132a35'],water:['fill-color','#174351'],landuse_residential:['fill-color','#203b46'],landuse_park:['fill-color','#314b40'],landcover_wood:['fill-color','#2b4339'],building:['fill-color','#47616b'],highway_minor:['line-color','#3b5660'],highway_major_inner:['line-color','#617981']};
    for(const layer of style.layers){
      if(colors[layer.id]){const [property,color]=colors[layer.id];layer.paint={...layer.paint,[property]:color};delete layer.paint['fill-pattern'];}
      if(layer.type==='symbol'){
        if(layer['source-layer']==='place'||layer['source-layer']==='transportation')layer.layout={...layer.layout,visibility:'none'};
        else if(layer.layout?.['text-field']){
          if(layer['source-layer']==='transportation_name')layer.minzoom=16;
          layer.layout['text-field']=['coalesce',['get','name:ru'],['get','name']];
          layer.paint={...layer.paint,'text-color':'#a2b8be','text-halo-color':'#172e37','text-halo-width':1};
        }
      }
    }
    map=new maplibregl.Map({container:'map',style,...cityView,maxPitch:65,minZoom:9,maxZoom:17,canvasContextAttributes:{antialias:true},attributionControl:false});
    map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
    map.on('error',event=>{console.warn('Map resource:',event.error?.message);onStatus('Карта загружается не полностью. Сравнение планов доступно.',true);});
    map.on('load',()=>{
      const before='highway_name_other';
      map.addSource('districts',{type:'geojson',data:geo});
      const known=['in',['get','ADM2_PCODE'],['literal',Object.values(codes)]];
      map.addLayer({id:'district-fill',type:'fill',source:'districts',filter:known,paint:{'fill-color':'#a7ba9d','fill-opacity':.12}},before);
      map.addLayer({id:'district-outline',type:'line',source:'districts',filter:known,paint:{'line-color':'#adc7bd','line-opacity':.35,'line-width':1}},before);
      map.addLayer({id:'district-selected',type:'line',source:'districts',filter:['==',['get','ADM2_PCODE'],'none'],paint:{'line-color':'#d8ebaa','line-opacity':.8,'line-width':2}},before);
      map.addLayer({id:'city-buildings',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:12,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],8],0,'#3f5964',25,'#63828a',65,'#89a9a6',140,'#c7d9c3'],'fill-extrusion-height':['coalesce',['get','render_height'],8],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.9,'fill-extrusion-vertical-gradient':true}},before);
      map.addSource('reallocation',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
      map.addLayer({id:'reallocation',type:'line',source:'reallocation',paint:{'line-color':'#d8efaa','line-width':2,'line-opacity':.8,'line-dasharray':[2,3]}});
      map.setLight({anchor:'viewport',color:'#e1eee6',intensity:.48,position:[1.5,190,45]});
      for(const [name,position] of Object.entries(centers)){
        const element=document.createElement('button');
        element.type='button';element.className='district-marker';
        element.innerHTML='<span class="district-dot"></span><strong>'+name+'</strong><span class="allocation"></span><span class="marker-warning" hidden></span>';
        element.onclick=event=>{event.stopPropagation();onSelect(name);};
        markers.set(name,new maplibregl.Marker({element,anchor:'center'}).setLngLat(position).addTo(map));
      }
      for(const [name,position] of [['Байтерек',[71.4305,51.1283]],['Хан Шатыр',[71.4038,51.1324]],['Акорда',[71.446,51.1257]]]){
        const element=document.createElement('div');element.className='city-landmark';
        element.innerHTML='<strong>'+name+'</strong><i></i><b></b>';
        landmarks.push(new maplibregl.Marker({element,anchor:'bottom'}).setLngLat(position).addTo(map));
      }
      map.on('click','district-fill',event=>{
        const code=event.features?.[0]?.properties.ADM2_PCODE;
        const name=Object.keys(codes).find(name=>codes[name]===code);
        if(name)onSelect(name);
      });
      ready=true;if(view)present(view);if(mode==='districts')fitOverview(0);
      map.once('idle',()=>onStatus(''));
    });
    document.getElementById('overview').onclick=()=>{if(mode==='districts')fitOverview();else map.flyTo({...cityView,duration:reducedMotion?0:1000});};
    document.getElementById('city-view').onclick=()=>setView('city');
    document.getElementById('district-view').onclick=()=>setView('districts');
    document.getElementById('zoom-in').onclick=()=>map.zoomIn({duration:reducedMotion?0:250});
    document.getElementById('zoom-out').onclick=()=>map.zoomOut({duration:reducedMotion?0:250});
  }catch(error){console.error(error);onStatus(error.message+' Район можно выбрать в списке справа.',true);}
  window.addEventListener('panel-layout-change',()=>map?.resize());
  return {present,setView};
}
