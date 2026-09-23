import {readFile} from 'node:fs/promises';

const cityRoot=new URL('../demos/astana-city/',import.meta.url);
const storyRoot=new URL('../demos/astana-story/',import.meta.url);
const mobileRoot=new URL('../mobile/',import.meta.url);
const cityAssets=new Map([
 ['/demos/astana-city/',['index.html','text/html']],
 ['/demos/astana-city/app.mjs',['app.mjs','text/javascript']],
 ['/demos/astana-city/planner.mjs',['planner.mjs','text/javascript']],
 ['/demos/astana-city/session.mjs',['session.mjs','text/javascript']],
 ['/demos/astana-city/planner.css',['planner.css','text/css']],
 ['/demos/astana-city/style.css',['style.css','text/css']],
 ['/demos/astana-city/base-style.json',['base-style.json','application/json']],
 ['/demos/astana-city/astana.geojson',['astana.geojson','application/geo+json']],
 ['/demos/astana-city/vendor/maplibre-gl.js',['vendor/maplibre-gl.js','text/javascript']],
 ['/demos/astana-city/vendor/maplibre-gl.css',['vendor/maplibre-gl.css','text/css']]
]);
const storyAssets=new Map([
 ['/demos/astana-story/',['index.html','text/html']],
 ['/demos/astana-story/index.html',['index.html','text/html']],
 ['/demos/astana-story/main.html',['main.html','text/html']],
 ...['app.mjs','assistant-bootstrap.mjs','catalog-ui.mjs','comparison.mjs','map.mjs','planner.mjs','shell.mjs','theme.js','ui.js','widget-layout.mjs','onboarding.mjs'].map(file=>['/demos/astana-story/'+file,[file,'text/javascript']]),
 ...['base.css','login.css','style.css','onboarding.css'].map(file=>['/demos/astana-story/'+file,[file,'text/css']]),
 ...['akim-civic-hall.png','hall-dark.jpg','hall-light.jpg','kz-emblem.webp'].map(file=>['/demos/astana-story/assets/'+file,['assets/'+file,file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg']]),
 ['/demos/astana-story/assets/brand-motion.js',['assets/brand-motion.js','text/javascript']],
 ['/demos/astana-story/assets/gridstack/gridstack-all.js',['assets/gridstack/gridstack-all.js','text/javascript']],
 ['/demos/astana-story/assets/gridstack/gridstack.min.css',['assets/gridstack/gridstack.min.css','text/css']],
 ...['assistant.mjs','sse.mjs'].map(file=>['/demos/astana-story/assistant/'+file,['assistant/'+file,'text/javascript']]),
 ['/demos/astana-story/assistant/assistant.css',['assistant/assistant.css','text/css']],
 ['/demos/astana-story/assistant/avatar/head.mjs',['assistant/avatar/head.mjs','text/javascript']],
 ['/demos/astana-story/assistant/avatar/head.css',['assistant/avatar/head.css','text/css']],
 ['/demos/astana-story/assistant/avatar/assets/avatarsdk.glb',['assistant/avatar/assets/avatarsdk.glb','model/gltf-binary']],
 ['/demos/astana-story/assistant/avatar/vendor/build/three.core.js',['assistant/avatar/vendor/build/three.core.js','text/javascript']],
 ['/demos/astana-story/assistant/avatar/vendor/build/three.module.js',['assistant/avatar/vendor/build/three.module.js','text/javascript']],
 ['/demos/astana-story/assistant/avatar/vendor/examples/jsm/loaders/GLTFLoader.js',['assistant/avatar/vendor/examples/jsm/loaders/GLTFLoader.js','text/javascript']],
 ['/demos/astana-story/assistant/avatar/vendor/examples/jsm/utils/BufferGeometryUtils.js',['assistant/avatar/vendor/examples/jsm/utils/BufferGeometryUtils.js','text/javascript']],
 ['/demos/astana-story/assistant/avatar/vendor/examples/jsm/utils/SkeletonUtils.js',['assistant/avatar/vendor/examples/jsm/utils/SkeletonUtils.js','text/javascript']]
]);
const exact=new Map([
 ['/briefing/',['../briefing/index.html','text/html']],
 ['/briefing/app.mjs',['../briefing/app.mjs','text/javascript']],
 ['/briefing/session.mjs',['../briefing/session.mjs','text/javascript']],
 ['/briefing/style.css',['../briefing/style.css','text/css']],
 ['/analytics/',['../analytics/public/index.html','text/html']],
 ['/analytics/workbench.js',['../analytics/public/workbench.js','text/javascript']],
 ['/analytics/workbench.css',['../analytics/public/workbench.css','text/css']],
 ['/workbench.js',['../analytics/public/workbench.js','text/javascript']],
 ['/workbench.css',['../analytics/public/workbench.css','text/css']],
 ['/docs/brief-analysis/dist/data.mjs',['../docs/brief-analysis/dist/data.mjs','text/javascript']],
 ['/docs/brief-analysis/dist/model.mjs',['../docs/brief-analysis/dist/model.mjs','text/javascript']],
 ['/docs/brief-analysis/dist/sources/brief.pdf',['../docs/brief-analysis/dist/sources/brief.pdf','application/pdf']],
 ['/docs/brief-analysis/dist/sources/dataset.docx',['../docs/brief-analysis/dist/sources/dataset.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
 ['/frontend/lib/scenario.mjs',['../frontend/lib/scenario.mjs','text/javascript']],
 ['/frontend/lib/format.mjs',['../frontend/lib/format.mjs','text/javascript']]
]);
export function resolveStaticAsset(path){
 const city=cityAssets.get(path);
 if(city)return {file:new URL(city[0],cityRoot),type:city[1]};
 const story=storyAssets.get(path);
 if(story)return {file:new URL(story[0],storyRoot),type:story[1]};
 if(path==='/mobile/')return {file:new URL('index.html',mobileRoot),type:'text/html'};
 const preview=path.match(/^\/mobile\/preview\/([A-Za-z0-9][A-Za-z0-9._-]*\.png)$/);
 if(preview)return {file:new URL('preview/'+preview[1],mobileRoot),type:'image/png'};
 const found=exact.get(path);
 return found?{file:new URL(found[0],import.meta.url),type:found[1]}:null;
}
export async function staticResponse(path){
 const asset=resolveStaticAsset(path);
 if(!asset)return null;
 try{return {...asset,body:await readFile(asset.file)};}
 catch(error){
  if(error?.code==='ENOENT'||error?.code==='ENOTDIR')return null;
  throw error;
 }
}
