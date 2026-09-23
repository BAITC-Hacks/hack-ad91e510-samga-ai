let current=null,generation=0,pendingHost=null;
export function preserveScene(state){
  if(state.view==='home'&&state.mapMode==='3d'&&current){const host=current.host;host.remove();return host;}
  if(current){current.dispose();current=null;}
  pendingHost=null;generation++;return null;
}
export function mountScene(state,callbacks,preserved){
  if(state.view!=='home'||state.mapMode!=='3d')return;
  let host=document.querySelector('#city-3d-host');if(!host)return;
  if(preserved&&current){host.replaceWith(preserved);current.update();return;}
  if(pendingHost===host)return;
  const run=++generation;pendingHost=host;
  import('./city-scene.mjs').then(({createCityScene})=>{
    if(run!==generation||!host.isConnected)return;
    current=createCityScene(host,state,callbacks);pendingHost=null;
  }).catch(error=>{
    if(run!==generation)return;
    pendingHost=null;host.replaceChildren();callbacks.onFallback?.(error);
  });
}
export function sceneZoom(factor){current?.zoom(factor);}
export function sceneTilt(){current?.tilt();}
