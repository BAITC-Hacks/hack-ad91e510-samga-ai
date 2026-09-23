import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
// Five bounded urban fragments; never presented as complete coverage of the city.
const areas=[[51.116,71.367,51.136,71.397],[51.118,71.42,51.138,71.45],[51.162,71.395,51.182,71.425],[51.185,71.445,51.205,71.475],[51.145,71.475,51.165,71.505]];
const endpoint=process.env.OVERPASS_URL||'https://overpass-api.de/api/interpreter';
const extracts=[];
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
for(let i=0;i<areas.length;i++){
  const cache=new URL(`../test-results/building-fragment-${i}.json`,import.meta.url);
  try {const cached=JSON.parse(await readFile(cache));if(JSON.stringify(cached.area)===JSON.stringify(areas[i])){extracts.push(cached);console.log(`Fragment ${i+1}/5: cached`);continue;}}catch{}
  const query=`[out:json][timeout:30];way["building"](${areas[i].join(',')});out tags geom;`;
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'SAMGA-Hackathon-Map/1.0'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(45000)});
    if(response.ok)break;
    if(![429,502,503,504].includes(response.status)||attempt===2)throw new Error(`Building fragment ${i+1}: ${response.status}`);
    const seconds=Math.max(20*(attempt+1),Number(response.headers.get('retry-after'))||0);
    await response.body?.cancel();console.log(`Map service busy; waiting ${seconds}s before retry.`);await delay(seconds*1000);
  }
  const part=await response.json();
  if(!part.elements?.length||part.remark)throw new Error(part.remark||'Empty building fragment');
  part.area=areas[i];await writeFile(cache,JSON.stringify(part));
  extracts.push(part);console.log(`Fragment ${i+1}/5: ${part.elements.length} buildings`);
  if(i<areas.length-1)await delay(10000);
}
const data={osm3s:extracts[0].osm3s,areas,elements:[...new Map(extracts.flatMap(d=>d.elements).map(e=>[e.id,e])).values()]};
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
await writeFile(new URL('../test-results/osm-buildings.json',import.meta.url),JSON.stringify(data));
console.log(JSON.stringify({buildings:data.elements.length,timestamp:data.osm3s?.timestamp_osm_base}));
