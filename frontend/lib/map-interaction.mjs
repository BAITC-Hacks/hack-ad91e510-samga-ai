import { DEFAULT_CAMERA } from '../components/CityMap.mjs';
export function zoomCamera(camera, factor) {
  const [x,y,w,h]=camera;
  const width=Math.max(350,Math.min(1450,w*factor));
  const height=width*h/w;
  return [x+(w-width)/2,y+(h-height)/2,width,height];
}
export function bindMapInteraction(state) {
  const svg=document.querySelector('#city-map');
  if(!svg) return;
  let drag=null,dragged=false;
  const paint=()=>svg.setAttribute('viewBox',state.mapCamera.join(' '));
  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0) return;
    const inverse=svg.getScreenCTM()?.inverse();
    if(!inverse) return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,inverse,camera:[...(state.mapCamera??DEFAULT_CAMERA)]};
    dragged=false;
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId) return;
    if(!(event.buttons&1)){drag=null;return;}
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<5&&!dragged) return;
    dragged=true;svg.setPointerCapture(event.pointerId);
    const start=new DOMPoint(drag.x,drag.y).matrixTransform(drag.inverse);
    const now=new DOMPoint(event.clientX,event.clientY).matrixTransform(drag.inverse);
    state.mapCamera=[Math.max(-600,Math.min(1000,drag.camera[0]-(now.x-start.x))),Math.max(-500,Math.min(900,drag.camera[1]-(now.y-start.y))),drag.camera[2],drag.camera[3]];
    paint();
  });
  const finish=event=>{if(drag?.id===event.pointerId){drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);}};
  svg.addEventListener('pointerup',finish);
  svg.addEventListener('pointercancel',finish);
  svg.addEventListener('click',event=>{if(dragged){event.preventDefault();event.stopPropagation();dragged=false;}},true);
  svg.addEventListener('wheel',event=>{
    if(!event.ctrlKey) return;
    event.preventDefault();state.mapCamera=zoomCamera(state.mapCamera??DEFAULT_CAMERA,event.deltaY>0?1.12:1/1.12);paint();
  },{passive:false});
}
