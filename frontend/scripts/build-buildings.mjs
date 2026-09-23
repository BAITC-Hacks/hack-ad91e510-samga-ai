import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { worldPoint,districtAt,sceneDistricts,polygonArea,buildingHeight } from '../lib/scene-geography.mjs';
const raw=JSON.parse(await readFile(new URL('../test-results/osm-buildings.json',import.meta.url)));
const buildings=[];
for(const element of raw.elements){
  if(element.type!=='way'||!element.geometry||element.geometry.length<4)continue;
  const first=element.geometry[0],last=element.geometry.at(-1);
  if(first.lat!==last.lat||first.lon!==last.lon)continue;
  const p=element.geometry.slice(0,-1).map(point=>worldPoint(point).map(n=>Math.round(n*1000)/1000));
  const area=polygonArea(p);if(area<.0008||area>60)continue;
  const center=p.reduce((a,q)=>[a[0]+q[0]/p.length,a[1]+q[1]/p.length],[0,0]);
  const d=districtAt(center);if(d<0)continue;
  const tags=element.tags??{},height=buildingHeight(tags);
  buildings.push({id:element.id,d,p,h:height.height,hs:height.source,l:height.levels,t:tags.building,n:tags['name:ru']||tags.name||'',a:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(', ')});
}
if(!buildings.length)throw new Error('No valid building geometry.');
const coverage=sceneDistricts.map((d,index)=>{
  const matching=buildings.filter(b=>b.d===index),bins=new Map();
  for(const building of matching){
    const center=building.p.reduce((a,p)=>[a[0]+p[0]/building.p.length,a[1]+p[1]/building.p.length],[0,0]);
    const key=center.map(n=>Math.floor(n/20)).join(',');
    const bin=bins.get(key)||{n:0,x:0,z:0};bin.n++;bin.x+=center[0];bin.z+=center[1];bins.set(key,bin);
  }
  const dense=[...bins.values()].sort((a,b)=>b.n-a.n)[0];
  return {name:d.name,count:matching.length,focus:dense?[dense.x/dense.n,dense.z/dense.n]:d.point};
});
const output={source:'OpenStreetMap contributors',license:'ODbL-1.0',timestamp:raw.osm3s?.timestamp_osm_base,areas:raw.areas,scope:'Five urban fragments, not full city coverage',heightNote:'OSM height where available; otherwise levels × 3 m or illustrative 9 m. Vertical exaggeration in the scene: 2.5×.',coverage,buildings};
await mkdir(new URL('../data/',import.meta.url),{recursive:true});
await writeFile(new URL('../data/astana-buildings.json',import.meta.url),JSON.stringify(output));
console.log(JSON.stringify({count:buildings.length,coverage,bytes:JSON.stringify(output).length,heights:buildings.reduce((a,b)=>(a[b.hs]=(a[b.hs]||0)+1,a),{})}));
