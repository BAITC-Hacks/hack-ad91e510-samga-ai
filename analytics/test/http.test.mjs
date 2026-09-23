import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';
import {createApp} from '../../backend/server.mjs';import {calculateScenario} from '../scenarios.mjs';
import {scenarios} from '../../docs/brief-analysis/dist/data.mjs';
const choices=scenarios[0].choices;
const intent={action:'analyze',objective:'score',maxBudget:100,criticalLimit:null,required:[],excluded:[],horizonYears:2,measureIds:[],clarification:'none'};
const reply=selection=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(selection)}]}]});
async function start(t,config={}){
 const app=createApp({mode:'demo',...config});app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
 const root='http://127.0.0.1:'+app.address().port;
 return async(path,data)=>{const r=await fetch(root+path,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:r.headers.get('content-type').includes('application/json')?await r.json():await r.text()};};
}
test('HTTP workbench, catalog, facts, evidence and comparison run offline',async t=>{
 const post=await start(t);
 assert.equal((await post('/')).status,200);assert.equal((await post('/workbench.js')).status,200);
 assert.equal((await post('/api/catalog')).body.measures.length,14);
 const facts=await post('/api/facts',{choices});assert.equal(facts.body.mode,'verified');
 assert.equal((await post('/api/facts',{choices,years:10})).body.error.code,'HORIZON_UNSUPPORTED');
 assert.equal((await post('/api/evidence',{measureIds:['M9']})).body.gaps[0],'M9');
 const c=await post('/api/compare',{left:choices,right:choices});assert.equal(c.body.delta.score,0);
});
test('tampered fields never reach AI transport',async t=>{
 let calls=0;const post=await start(t,{mode:'openai',apiKey:'test',model:'test',fetchImpl:async()=>{calls++;throw Error('not expected');}});
 for(const change of [s=>s.result.cost--,s=>s.result.districts[2].values.E2++,s=>s.baseline.score++,s=>s.scenarioId='old']){
  const s=calculateScenario(choices);change(s);assert.equal((await post('/api/analyze',s)).body.error.code,'SCENARIO_MISMATCH');
 }
 assert.equal(calls,0);
});
test('AI prose, fabricated fact IDs and wrong polarity are rejected',async t=>{
 for(const selection of [
 {strengthIds:['not-a-fact'],riskIds:[],nextAction:'compare'},
 {strengthIds:['result.cost'],riskIds:[],nextAction:'compare'},
 {strengthIds:[],riskIds:['result.score'],nextAction:'compare'},
 {summary:'Все проблемы решены',strengthIds:[],riskIds:[],nextAction:'compare'}]){
  const post=await start(t,{mode:'openai',apiKey:'test',model:'test',fetchImpl:async()=>reply(selection)});
  const r=await post('/api/analyze',calculateScenario(choices));assert.equal(r.status,502);
 }
});
test('AI intent executes tools without model-generated numeric facts',async t=>{
 const post=await start(t,{mode:'openai',apiKey:'test',model:'test',fetchImpl:async()=>reply(intent)});
 const r=await post('/api/assistant',{question:'Что изменится?',choices});
 assert.equal(r.status,200);assert.equal(r.body.action,'analyze');assert.equal(r.body.scenarioId,calculateScenario(choices).scenarioId);
 assert.match(r.body.analysis.summary,/95/);
});
test('unsupported forecast and missing comparison remain explicit',async t=>{
 for(const [change,action] of [[{horizonYears:10},'unsupported_horizon'],[{action:'compare'},'clarify']]){
 const post=await start(t,{mode:'openai',apiKey:'test',model:'test',fetchImpl:async()=>reply({...intent,...change})});
 const r=await post('/api/assistant',{question:'Проверить гипотезу',choices});assert.equal(r.body.action,action);
 assert.equal(Object.hasOwn(r.body,'forecast'),false);
 }
});
test('invalid question, offline AI and injected numeric input are blocked',async t=>{
 const post=await start(t);
 assert.equal((await post('/api/assistant',{question:'Тест',choices})).body.error.code,'AI_NOT_CONFIGURED');
 assert.equal((await post('/api/assistant',{question:'Тест',choices,score:99})).status,422);
 assert.equal((await post('/api/search',{maxBudget:101})).status,422);
 assert.equal((await post('/api/evidence',{measureIds:['M99']})).status,422);
});
test('assistant optimizer obeys school constraint and never applies the plan',async t=>{
 const post=await start(t,{mode:'openai',apiKey:'test',model:'test',fetchImpl:async()=>reply({...intent,action:'optimize',objective:'cost',criticalLimit:0,required:[{id:'M7',district:'Нура'}]})});
 const r=await post('/api/assistant',{question:'Сохранить школу в Нуре, убрать критические показатели и потратить меньше',choices});
 assert.equal(r.status,200);assert.equal(r.body.search.scenario.result.cost,80);assert.equal(r.body.requiresApply,true);
 assert.equal(r.body.scenarioId,calculateScenario(choices).scenarioId);
});
