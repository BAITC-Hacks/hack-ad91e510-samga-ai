// Run after starting the server. Works in demo and live modes.
import {scenarios} from '../docs/brief-analysis/dist/data.mjs';
const base=process.env.API_URL ?? 'http://127.0.0.1:3001';
async function post(path,payload) {
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
  const body=await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return body;
}
const simulation=await post('/api/simulate',{choices:scenarios[0].choices});
console.log(JSON.stringify({scenarioId:simulation.scenarioId,score:simulation.result.score,cost:simulation.result.cost},null,2));
console.log(JSON.stringify(await post('/api/analyze',simulation),null,2));
