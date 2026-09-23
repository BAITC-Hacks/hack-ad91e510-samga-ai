import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { createCityTerrain,createBuildingMeshes,buildingForFace,buildingOutline } from './scene-meshes.mjs';
import { activeSnapshot,districtIssues } from './district-insights.mjs';
import { esc,fmt } from './format.mjs';
import { scenePalette as palette } from './scene-palette.mjs';

const overviewPosition=new THREE.Vector3(230,310,360),overviewTarget=new THREE.Vector3(25,0,5);
let buildingsPromise;
function loadBuildings(){return buildingsPromise??=fetch('/data/astana-buildings.json').then(r=>{if(!r.ok)throw new Error('Building data unavailable');return r.json();}).catch(error=>{buildingsPromise=null;throw error;});}
const buildingNames={apartments:'Жилой дом',residential:'Жилое здание',house:'Частный дом',commercial:'Коммерческое здание',retail:'Торговое здание',office:'Офисное здание',school:'Школа',hospital:'Медицинское здание',kindergarten:'Детский сад',yes:'Здание',garage:'Гараж',garages:'Гаражи',church:'Религиозное здание',mosque:'Мечеть'};

export function createCityScene(host,state,{onDistrict,onOverview,onFallback}={}) {
  const abort=new AbortController(),signal=abort.signal;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(palette.background,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.domElement.className='city-webgl-canvas';renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label','3D-карта Астаны. Вращайте мышью или стрелками. Enter приближает выбранный район, Escape возвращает город.');
  host.append(renderer.domElement);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(palette.skyLight,palette.groundLight,1.2));
  const sun=new THREE.DirectionalLight(palette.sunLight,1.8);sun.position.set(-120,280,180);scene.add(sun);
  const rim=new THREE.DirectionalLight(palette.rimLight,.7);rim.position.set(170,60,-180);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(43,1,.15,2400);camera.position.copy(overviewPosition);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(overviewTarget);
  controls.enableDamping=true;controls.dampingFactor=.14;controls.minDistance=12;controls.maxDistance=1350;
  controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.465;controls.enablePan=true;controls.screenSpacePanning=false;
  controls.zoomSpeed=.8;controls.rotateSpeed=.55;controls.update();
  const regions=createCityTerrain(scene),labels=document.createElement('div');labels.className='scene-labels';host.append(labels);
  let disposed=false,frame=null,tween=null,buildingMeshes=[],buildingData=null,selectedOutline=null,inView=true,hovered=null;
  let lastFocus=Symbol('initial'),lastVersion=-1,clickStart=null,buildingError=false,lastAspect=null;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const labelButtons=regions.map(region=>{
    const button=document.createElement('button');button.type='button';button.className='scene-district-label';button.dataset.district=region.name;
    button.addEventListener('click',event=>{event.stopPropagation();onDistrict?.(region.name);},{signal});labels.append(button);return button;
  });
  const popover=document.createElement('div');popover.className='building-popover';popover.hidden=true;host.append(popover);
  const loading=document.createElement('div');loading.className='scene-loading';loading.setAttribute('role','status');loading.textContent='Подготавливаем кварталы…';host.append(loading);
  function savePose(){state.mapPose={position:camera.position.toArray(),target:controls.target.toArray(),aspect:camera.aspect};}
  function schedule(){if(!disposed&&frame===null)frame=requestAnimationFrame(draw);}
  function frameLabels(){
    const width=host.clientWidth,height=host.clientHeight;
    regions.forEach((region,index)=>{
      const p=region.pin.position.clone();p.y+=6;p.project(camera);
      const focused=state.mapFocus;
      const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<.92&&Math.abs(p.y)<.91&&!focused;
      labelButtons[index].hidden=!visible;
      labelButtons[index].style.transform=`translate(-50%, -100%) translate(${(p.x*.5+.5)*width}px,${(-p.y*.5+.5)*height}px)`;
    });
    const compass=host.parentElement?.querySelector('.map-north svg');
    if(compass)compass.style.transform=`rotate(${-controls.getAzimuthalAngle()*180/Math.PI}deg)`;
  }
  function draw(now){
    frame=null;if(disposed)return;
    if(tween){const t=reduced?1:Math.min(1,(now-tween.start)/650),e=1-Math.pow(1-t,3);camera.position.lerpVectors(tween.fromPosition,tween.toPosition,e);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,e);if(t===1){tween=null;savePose();}else schedule();}
    controls.update();
    if(inView&&!document.hidden){renderer.render(scene,camera);frameLabels();host.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');}
  }
  function fly(position,target){tween={start:performance.now(),fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),toPosition:position.clone(),toTarget:target.clone()};schedule();}
  const aspectScale=aspect=>Math.max(1,1.3/aspect);
  const cityPosition=()=>overviewPosition.clone().sub(overviewTarget).multiplyScalar(aspectScale(camera.aspect)).add(overviewTarget);
  function focusDistrict(name){
    const region=regions.find(r=>r.name===name),coverage=buildingData?.coverage.find(d=>d.name===name);
    const point=coverage?.focus??region?.point;if(!point)return;
    const target=new THREE.Vector3(point[0],0,point[1]);
    fly(target.clone().add(new THREE.Vector3(14,25,28).multiplyScalar(Math.max(1,1/camera.aspect))),target);
  }
  function dismissBuilding(){
    popover.hidden=true;
    if(selectedOutline){scene.remove(selectedOutline);selectedOutline.geometry.dispose();selectedOutline.material.dispose();selectedOutline=null;}
    delete host.dataset.building;schedule();
  }
  function showBuilding(building,index){
    dismissBuilding();selectedOutline=buildingOutline(building);scene.add(selectedOutline);host.dataset.building=String(building.id);
    const title=building.n||buildingNames[building.t]||'Здание';
    const heightLabel=building.hs==='height'?'Высота из OSM':building.hs==='levels'?'Оценка по этажам':'Условная высота';
    popover.innerHTML=`<button class="building-close" aria-label="Закрыть сведения о здании">×</button><span class="instrument-eyebrow">ОБЪЕКТ НА КАРТЕ</span><h3>${esc(title)}</h3><p>${esc(building.a||regions[index].name)}</p><dl><div><dt>Этажность</dt><dd>${building.l??'Нет данных'}</dd></div><div><dt>${heightLabel}</dt><dd>${building.hs==='height'?'':'≈ '}${fmt(building.h,0)} м</dd></div></dl><p class="building-data-note">Меры и проблемы относятся к району. Высота в сцене визуально увеличена.</p><a href="https://www.openstreetmap.org/way/${building.id}" target="_blank" rel="noopener">Объект в OpenStreetMap ↗</a>`;
    popover.querySelector('button').addEventListener('click',dismissBuilding,{signal});popover.hidden=false;schedule();
  }
  function intersect(event){
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const candidates=[...regions.flatMap(r=>[r.mesh,r.pin]),...(state.showBuildings?buildingMeshes:[])];
    return raycaster.intersectObjects(candidates,false)[0];
  }
  function recolor(){
    const snapshot=activeSnapshot(state);
    regions.forEach((region,index)=>{
      const district=snapshot.districts.find(d=>d.name===region.name),selected=state.district===region.name;
      const issues=districtIssues(district,state.data.indicators,state.mapLayer).filter(i=>i.value<60);
      region.top.color.setHex(selected?palette.terrainSelected:hovered===region.name?palette.terrainHover:palette.terrain);
      region.top.emissive.setHex(selected?palette.terrainEmission:0x000000);region.wall.color.setHex(selected?palette.wallSelected:palette.wall);
      region.edge.material.color.setHex(selected?palette.edgeSelected:palette.edge);region.edge.material.opacity=selected?.9:.55;
      region.pin.material.color.setHex(issues.some(i=>i.severity==='critical')?palette.critical:issues.length?palette.attention:palette.stable);
      const focusPoint=state.mapFocus===region.name?buildingData?.coverage.find(d=>d.name===region.name)?.focus:null;
      const point=focusPoint??region.point;region.pin.position.set(point[0],2.8,point[1]);region.halo.position.set(point[0],.28,point[1]);
      region.pin.visible=!state.mapFocus;region.halo.visible=region.pin.visible;
      const label=labelButtons[index];label.classList.toggle('selected',selected);label.setAttribute('aria-label',`Приблизить район ${region.name}`);
      label.innerHTML=`<strong>${esc(region.name)}</strong><span>${fmt(district.score,1)} <i>·</i> ${issues.length} зон внимания</span>`;
    });
    buildingMeshes.forEach(mesh=>{mesh.visible=state.showBuildings;});
  }
  function status(){
    host.dataset.ready='true';host.dataset.focus=state.mapFocus||'city';
    host.parentElement?.classList.add('webgl-ready');
    const detail=host.parentElement?.querySelector('[data-scene-detail]');
    if(detail){const count=state.mapFocus?buildingData?.coverage.find(d=>d.name===state.mapFocus)?.count:buildingData?.buildings.length;detail.textContent=buildingError?'Контуры районов · застройка недоступна':count?`${count.toLocaleString('ru-RU')} зданий · фрагменты OSM`:'Контуры районов · загружаем здания';}
  }
  function update(){
    if(disposed)return;
    recolor();status();
    if(lastFocus!==state.mapFocus||lastVersion!==state.sceneCameraVersion){
      const initial=typeof lastFocus==='symbol';lastFocus=state.mapFocus;lastVersion=state.sceneCameraVersion;
      dismissBuilding();
      if(initial&&state.mapPose){camera.position.fromArray(state.mapPose.position);controls.target.fromArray(state.mapPose.target);camera.position.sub(controls.target).multiplyScalar(aspectScale(camera.aspect)/aspectScale(state.mapPose.aspect??camera.aspect)).add(controls.target);controls.update();}
      else if(state.mapFocus)focusDistrict(state.mapFocus);else fly(cityPosition(),overviewTarget);
    }
    if(!state.showBuildings)dismissBuilding();schedule();
  }
  const resize=()=>{
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    const aspect=width/height;
    if(lastAspect!==null){
      const ratio=aspectScale(aspect)/aspectScale(lastAspect);
      camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
      if(tween){tween.fromPosition.sub(tween.fromTarget).multiplyScalar(ratio).add(tween.fromTarget);tween.toPosition.sub(tween.toTarget).multiplyScalar(ratio).add(tween.toTarget);}
    }
    lastAspect=aspect;camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setSize(width,height,false);host.dataset.viewport=`${width},${height}`;controls.update();schedule();
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)schedule();});visibility.observe(host);
  controls.addEventListener('change',()=>{if(!tween)savePose();schedule();});
  controls.addEventListener('start',()=>{tween=null;});
  renderer.domElement.addEventListener('pointerdown',event=>{clickStart={x:event.clientX,y:event.clientY,button:event.button};},{signal});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!clickStart||clickStart.button!==0||Math.hypot(event.clientX-clickStart.x,event.clientY-clickStart.y)>5){clickStart=null;return;}clickStart=null;
    const hit=intersect(event);if(!hit){dismissBuilding();return;}
    const data=hit.object.userData;
    if(data.kind==='buildings'&&state.mapFocus===data.district){const building=buildingForFace(data.ranges,hit.faceIndex);if(building)showBuilding(building,data.index);}
    else onDistrict?.(data.district);
  },{signal});
  renderer.domElement.addEventListener('pointercancel',()=>{clickStart=null;},{signal});
  renderer.domElement.addEventListener('pointermove',event=>{
    if(event.buttons)return;
    const hit=intersect(event);renderer.domElement.style.cursor=hit?'pointer':'grab';
    const name=hit?.object.userData.district??null;if(name!==hovered){hovered=name;recolor();schedule();}
  },{signal});
  renderer.domElement.addEventListener('keydown',event=>{
    const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();tween=null;spherical.theta+=event.key==='ArrowLeft'?-.13:event.key==='ArrowRight'?.13:0;spherical.phi=Math.max(.15,Math.min(Math.PI*.46,spherical.phi+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0)));
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();schedule();
    }
    if(event.key==='Enter'){event.preventDefault();onDistrict?.(state.district);}
    if(event.key==='Escape'){event.preventDefault();if(!popover.hidden)dismissBuilding();else onOverview?.();}
  },{signal});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!disposed)onFallback?.();},{signal});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();},{signal});
  loadBuildings().then(data=>{
    if(disposed)return;buildingData=data;buildingMeshes=createBuildingMeshes(scene,data);host.dataset.buildings=String(data.buildings.length);loading.hidden=true;
    recolor();status();if(state.mapFocus)focusDistrict(state.mapFocus);schedule();
  }).catch(()=>{if(disposed)return;buildingError=true;loading.textContent='Застройка недоступна. Районы и управление работают.';loading.classList.add('notice');status();});
  resize();update();
  return {
    host,update,
    zoom(factor){tween=null;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();schedule();},
    tilt(){tween=null;const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.phi=spherical.phi<.65?1:.35;fly(controls.target.clone().add(new THREE.Vector3().setFromSpherical(spherical)),controls.target);},
    dispose(){if(disposed)return;savePose();disposed=true;abort.abort();if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();controls.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}
  };
}
