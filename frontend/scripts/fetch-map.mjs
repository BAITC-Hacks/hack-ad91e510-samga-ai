// One-time bounded map extract. Data: OpenStreetMap contributors, ODbL 1.0.
import { mkdir, writeFile } from 'node:fs/promises';
const query = `[out:json][timeout:60];(
relation["boundary"="administrative"]["admin_level"="6"](51.02,71.22,51.25,71.62);
way["highway"~"^(trunk|primary|secondary|tertiary)$"](51.02,71.22,51.25,71.62);
way["waterway"~"^(river|canal)$"](51.02,71.22,51.25,71.62);
way["natural"="water"](51.02,71.22,51.25,71.62);
way["leisure"="park"](51.02,71.22,51.25,71.62);
);out geom;`;
const endpoint = process.env.OVERPASS_URL || 'https://overpass.kumi.systems/api/interpreter';
const response = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'SAMGA-Hackathon-Map/1.0'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(85000)});
if (!response.ok) throw new Error(`Map extract failed: ${response.status}`);
const data = await response.json();
if (!data.elements?.length || data.remark) throw new Error(data.remark || 'Empty map extract');
const directory = new URL('../test-results/',import.meta.url);
await mkdir(directory,{recursive:true});
await writeFile(new URL('osm-extract.json',directory),JSON.stringify(data));
console.log(JSON.stringify({elements:data.elements.length,relations:data.elements.filter(e=>e.type==='relation').map(e=>({id:e.id,tags:e.tags})),timestamp:data.osm3s?.timestamp_osm_base}));
