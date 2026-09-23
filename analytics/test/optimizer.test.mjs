import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizePlans} from '../optimizer.mjs';
import {verifyScenario} from '../scenarios.mjs';
test('full search reproduces independent exhaustive audit',()=>{
 const r=optimizePlans({objective:'score'});
 assert.equal(r.validCount,694395);
 assert.ok(Math.abs(r.scenario.result.score-57.236735)<1e-9);
 assert.equal(r.scenario.result.cost,98);assert.deepEqual(verifyScenario(r.scenario),[]);
});
test('cheapest critical-free plan costs 66; required school costs 80',()=>{
 const a=optimizePlans({objective:'cost',criticalLimit:0});
 assert.equal(a.scenario.result.cost,66);
 const b=optimizePlans({objective:'cost',criticalLimit:0,required:[{id:'M7',district:'Нура'}]});
 assert.equal(b.scenario.result.cost,80);assert.ok(b.scenario.choices.some(c=>c.id==='M7'&&c.district==='Нура'));
});
test('infeasibility and unknown constraints are explicit',()=>{
 assert.equal(optimizePlans({maxBudget:1}).scenario,null);
 assert.throws(()=>optimizePlans({objective:'happiness'}),/INVALID_CONSTRAINTS/);
 assert.throws(()=>optimizePlans({required:[{id:'M99'}]}),/INVALID_CONSTRAINTS/);
 assert.throws(()=>optimizePlans({required:[{id:'M7',district:'Нура'}],excluded:['M7']}),/INVALID_CONSTRAINTS/);
});
