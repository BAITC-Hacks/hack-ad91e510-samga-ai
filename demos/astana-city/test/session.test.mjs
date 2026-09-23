import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlannerSession, apiRequest} from '../session.mjs';
import {createApp} from '../../../backend/server.mjs';
import {districts, measures, indicators, groups} from '../../../docs/brief-analysis/dist/data.mjs';
import {simulate} from '../../../docs/brief-analysis/dist/model.mjs';
import {calculateScenario} from '../../../analytics/scenarios.mjs';

const example=[{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
const catalog={districts,measures,indicators,groups,baseline:simulate([])};
const delay=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const make=async request=>{const s=createPlannerSession({request:async(path,body)=>path==='/api/catalog'?catalog:path==='/api/health'?{aiMode:'demo',aiConfigured:false}:request(path,body)});await s.load();return s;};

test('starts with no selected measures and requires exactly five before calculation',async()=>{
 const s=await make(()=>assert.fail('invalid plan reached server'));
 assert.deepEqual(s.state.choices,[]);assert.equal(s.state.spent,0);
 await s.calculate();assert.match(s.state.error,/5/);assert.equal(s.state.simulation,null);
});
test('choice controls reject duplicates, missing districts, global and same-district conflicts',async()=>{
 const s=await make();
 assert.equal(s.add({id:'M1'}),false);assert.equal(s.add({id:'M1',district:'Сарайшық'}),false);
 assert.equal(s.add({id:'M1',district:'Нура'}),true);assert.equal(s.add({id:'M1',district:'Есиль'}),false);
 assert.equal(s.add({id:'M3',district:'Есиль'}),false);
 s.clear();s.add({id:'M4',district:'Нура'});assert.equal(s.add({id:'M7',district:'Нура'}),false);
 assert.equal(s.add({id:'M7',district:'Есиль'}),true);
 s.clear();s.add({id:'M5',district:'Алматы'});assert.equal(s.add({id:'M13',district:'Алматы'}),false);
});
test('budget and category limits cannot be bypassed by choosing a district',async()=>{
 const s=await make();
 for(const c of [{id:'M3',district:'Нура'},{id:'M13',district:'Алматы'},{id:'M7',district:'Есиль'}])s.add(c);
 assert.equal(s.state.spent,82);assert.equal(s.add({id:'M2'}),false);assert.equal(s.state.spent,82);
 s.clear();s.add({id:'M7',district:'Нура'});s.add({id:'M8',district:'Нура'});
 assert.equal(s.add({id:'M9',district:'Нура'}),false);
});
test('editing the plan invalidates an in-flight calculation',async()=>{
 const response=delay(),s=await make(()=>response.promise);
 example.forEach(c=>s.add(c));const pending=s.calculate();s.remove('M5');
 response.resolve(calculateScenario(example));await pending;
 assert.equal(s.state.simulation,null);assert.equal(s.state.busy,false);assert.equal(s.state.choices.length,4);
});
test('late AI answer never attaches to a changed plan',async()=>{
 const response=delay(),s=await make(path=>path==='/api/simulate'?calculateScenario(example):response.promise);
 example.forEach(c=>s.add(c));await s.calculate();const pending=s.analyze();s.remove('M5');
 response.resolve({scenarioId:calculateScenario(example).scenarioId,mode:'openai',analysis:{summary:'old'}});await pending;
 assert.equal(s.state.analysis,null);assert.equal(s.state.aiBusy,false);
});
test('AI errors preserve computed results and display the server message',async()=>{
 const s=await make(path=>{if(path==='/api/simulate')return calculateScenario(example);throw new Error('Лимит AI исчерпан.');});
 example.forEach(c=>s.add(c));await s.calculate();await s.analyze();
 assert.ok(Math.abs(s.state.simulation.result.score-56.54307)<1e-8);
 assert.match(s.state.aiError,/Лимит AI/);assert.equal(s.state.analysis,null);
});
test('real HTTP server calculates DOCX example and receives full scenario for analysis',async t=>{
 const app=createApp({mode:'demo'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>app.close(r)));
 const base='http://127.0.0.1:'+app.address().port;
 const s=createPlannerSession({request:(path,body)=>apiRequest(path,body,{base})});await s.load();
 example.forEach(c=>assert.equal(s.add(c),true));await s.calculate();
 assert.equal(s.state.simulation.result.cost,95);
 assert.ok(Math.abs(s.state.simulation.baseline.score-52.55768)<1e-8);
 assert.ok(Math.abs(s.state.simulation.result.score-56.54307)<1e-8);
 await s.analyze();assert.equal(s.state.analysis.mode,'demo');
 assert.match(s.state.analysis.analysis.summary,/без вызова OpenAI/);
 await assert.rejects(apiRequest('/api/simulate',{choices:[]},{base}),/Проверьте решения/);
});
