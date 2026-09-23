import {readFile} from 'node:fs/promises';

const cityRoot=new URL('../demos/astana-city/',import.meta.url);
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
