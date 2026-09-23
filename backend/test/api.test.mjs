import {defaultSelection} from '../../analytics/grounding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../server.mjs';
import {analyze,demoAnalysis} from '../ai.mjs';
import {validateRequest} from '../contracts.mjs';
import {runSimulation} from '../simulator-adapter.mjs';
import {scenarios} from '../../docs/brief-analysis/dist/data.mjs';
const payload=()=>runSimulation(scenarios[0].choices); const pick=()=>defaultSelection(payload());
const completed=analysis=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(analysis)}]}]});
const options=fetchImpl=>({apiKey:'test-key-not-real',model:'test-model',fetchImpl});
async function server(t,config={mode:'demo'}) {
  const app=createApp(config);app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
  const url='http://127.0.0.1:'+app.address().port;
  return async (path,body,extra={})=>{
    const res=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),...extra});
    return {status:res.status,body:await res.json(),headers:res.headers};
  };
}
test('adapter preserves engine reference result and contract',()=>{
  const p=payload();assert.deepEqual(validateRequest(p),[]);
  assert.ok(Math.abs(p.result.score-56.54307)<1e-10);assert.equal(p.result.cost,95);
});
test('simulate then analyze: reproducible offline HTTP demo',async t=>{
  const post=await server(t);
  const simulated=await post('/api/simulate',{choices:scenarios[0].choices});
  assert.equal(simulated.status,200);
  const analyzed=await post('/api/analyze',simulated.body);
  assert.equal(analyzed.status,200);assert.equal(analyzed.body.mode,'demo');
  assert.equal(analyzed.body.score,simulated.body.result.score);
  assert.equal(analyzed.body.scenarioId,simulated.body.scenarioId);
});
test('AI transport uses strict schema and receives unchanged simulator numbers',async()=>{
  const p=payload();let sent;
  const result=await analyze(p,options(async(url,init)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(init.body);
    return Response.json(completed(pick()));
  }));
  assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);
  assert.deepEqual(JSON.parse(sent.input).simulation,p);
  assert.equal(Object.hasOwn(result.analysis,'score'),false);
});
test('HTTP rejects client-forged score before any AI call',async t=>{
  const post=await server(t,options(async()=>Response.json(completed(pick()))));
  const p=payload();p.result.score=54.123456789;
  const r=await post('/api/analyze',p);
  assert.equal(r.status,422);assert.equal(r.body.error.code,'SCENARIO_MISMATCH');
});
test('reject missing, nonfinite, extra fields and duplicate districts',()=>{
  for (const mutate of [p=>delete p.result.score,p=>p.result.score=NaN,p=>p.result.extra=1,
    p=>p.result.districts[1]=p.result.districts[0],p=>p.contractVersion='2']) {
    const p=payload();mutate(p);assert.ok(validateRequest(p).length);
  }
});
test('invalid scenario and input never call OpenAI',async t=>{
  let calls=0;
  const post=await server(t,options(async()=>{calls++;throw new Error('unexpected');}));
  assert.equal((await post('/api/analyze',{})).status,422);
  assert.equal((await post('/api/simulate',{choices:Array(5).fill({id:'M12'})})).status,422);
  const p=payload();p.choices=Array(5).fill({id:'M12'});
  assert.equal((await post('/api/analyze',p)).status,422);
  assert.equal(calls,0);
});
test('missing config yields explicit 503, never silent demo',async t=>{
  const post=await server(t,{});
  const r=await post('/api/analyze',payload());assert.equal(r.status,503);
  assert.equal(r.body.error.code,'AI_NOT_CONFIGURED');
});
test('OpenAI status failures are mapped without leaking provider body or secrets',async()=>{
  for (const [status,expected] of [[401,'AI_AUTH_ERROR'],[403,'AI_AUTH_ERROR'],[429,'AI_RATE_LIMIT'],[500,'AI_UPSTREAM_ERROR']]) {
    await assert.rejects(analyze(payload(),options(async()=>new Response('secret provider detail',{status}))),e=>e.code===expected && !e.message.includes('secret'));
  }
});
test('timeout, network, refusal, incomplete, invalid schema have stable codes',async()=>{
  const cases=[
    [async()=>{throw new DOMException('expired','TimeoutError');},'AI_TIMEOUT'],
    [async()=>{throw new TypeError('secret connection detail');},'AI_CONNECTION_ERROR'],
    [async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}),'AI_REFUSAL'],
    [async()=>Response.json({status:'incomplete',output:[]}),'AI_INCOMPLETE'],
    [async()=>Response.json(completed({...demoAnalysis(),score:99})),'AI_INVALID_RESPONSE'],
    [async()=>Response.json(completed({})),'AI_INVALID_RESPONSE'],
  ];
  for (const [fetchImpl,code] of cases) await assert.rejects(analyze(payload(),options(fetchImpl)),e=>e.code===code);
});
test('actual request deadline aborts a slow transport',async()=>{
  const keepAlive=setTimeout(()=>{},200);
  try {
    await assert.rejects(analyze(payload(),{...options(async(url,{signal})=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    })),timeoutMs:10}),e=>e.code==='AI_TIMEOUT');
  } finally {clearTimeout(keepAlive);}
});
test('HTTP rejects malformed JSON, wrong content type and oversized bodies',async t=>{
  const post=await server(t);
  assert.equal((await post('/api/analyze',{}, {body:'{'})).status,400);
  assert.equal((await post('/api/analyze',{}, {headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await post('/api/analyze',{text:'x'.repeat(66000)})).status,413);
});
test('CORS allows configured frontend and rejects other origins',async t=>{
  const post=await server(t,{mode:'demo',frontendOrigin:'http://127.0.0.1:4193'});
  const r=await post('/api/analyze',payload(),{headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4193'}});
  assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'http://127.0.0.1:4193');
  assert.equal((await post('/api/analyze',payload(),{headers:{'Content-Type':'application/json',Origin:'https://other.example'}})).status,403);
});
test('health, schemas, unknown route and wrong method',async t=>{
  const post=await server(t);
  assert.equal((await post('/api/health',undefined,{method:'GET'})).body.aiMode,'demo');
  assert.equal((await post('/api/contracts',undefined,{method:'GET'})).body.requestSchema.type,'object');
  assert.equal((await post('/missing',{})).status,404);
  assert.equal((await post('/api/analyze',undefined,{method:'GET'})).status,405);
});
test('AI concurrency limit returns 429 and releases slots after completion',async t=>{
  const releases=[];
  const post=await server(t,options(async()=>new Promise(resolve=>releases.push(()=>resolve(Response.json(completed(pick())))))));
  const first=post('/api/analyze',payload()), second=post('/api/analyze',payload());
  for (let i=0;i<100 && releases.length<2;i++) await new Promise(r=>setTimeout(r,5));
  assert.equal(releases.length,2);
  try {assert.equal((await post('/api/analyze',payload())).body.error.code,'AI_BUSY');}
  finally {releases.splice(0).forEach(release=>release());}
  assert.equal((await first).status,200);assert.equal((await second).status,200);
  const third=post('/api/analyze',payload());
  for (let i=0;i<100 && !releases.length;i++) await new Promise(r=>setTimeout(r,5));
  releases.splice(0).forEach(release=>release());assert.equal((await third).status,200);
});
