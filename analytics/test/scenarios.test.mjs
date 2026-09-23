import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateScenario,verifyScenario,compareScenarios,buildFacts,validateChoices} from '../scenarios.mjs';
import {scenarios} from '../../docs/brief-analysis/dist/data.mjs';
const choices=scenarios[0].choices;
test('official values and stable identity survive ordering, caller input remains unchanged',()=>{
 const original=structuredClone(choices),a=calculateScenario(choices),b=calculateScenario([...choices].reverse());
 assert.ok(Math.abs(a.result.score-56.54307)<1e-9);
 assert.ok(Math.abs(a.baseline.score-52.55768)<1e-9);
 assert.equal(a.scenarioId,b.scenarioId);assert.deepEqual(choices,original);
 assert.deepEqual(verifyScenario(a),[]);
});
test('tampered score, metric, baseline, identity or choices are rejected',()=>{
 for(const mutate of [s=>s.result.score+=1,s=>s.result.districts[0].values.T1+=1,
 s=>s.baseline.cost=1,s=>s.scenarioId='fake',s=>s.choices[0].district='Есиль']){
 const s=calculateScenario(choices);mutate(s);assert.ok(verifyScenario(s).length);
 }
});
test('malformed inputs fail without uncaught TypeError and unknown properties fail',()=>{
 for(const c of [null,{},[null],Array(5).fill(null),[{id:'M99'}],
 choices.map((c,i)=>i?c:{...c,cost:0})])assert.ok(validateChoices(c).length);
});
test('unsupported horizons never extrapolate two-year score',()=>{
 for(const years of [1,5,10])assert.throws(()=>calculateScenario(choices,{years}),/HORIZON_UNSUPPORTED/);
});
test('comparison explains actual changed measures and per-indicator tradeoffs',()=>{
 const other=choices.map(c=>c.id==='M5'?{id:'M6'}:c),r=compareScenarios(choices,other);
 assert.equal(r.delta.cost,-5);assert.ok(r.delta.score>0);
 assert.ok(r.metrics.find(m=>m.district==='Сарыарка'&&m.indicator==='E2').delta<0);
 assert.deepEqual(r.removed.map(c=>c.id),['M5']);assert.deepEqual(r.added.map(c=>c.id),['M6']);
});
test('facts are computed from verified data with unambiguous units and source',()=>{
 const s=calculateScenario(choices),facts=buildFacts(s);
 assert.equal(facts.find(f=>f.id==='result.cost').value,95);
 assert.ok(facts.every(f=>f.text && f.source && f.unit));
 s.result.score=100;assert.throws(()=>buildFacts(s),/SCENARIO_MISMATCH/);
});
