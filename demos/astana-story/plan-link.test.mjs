import test from 'node:test';
import assert from 'node:assert/strict';
import * as planner from './planner.mjs';

const choices=[{id:'M1',district:'Нура'},{id:'M4',district:'Сарыарка'},{id:'M7',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'}];

test('a briefing link restores the five user choices without changing districts',()=>{
 const result=planner.readLinkedPlan?.('?plan='+encodeURIComponent(JSON.stringify(choices)));
 assert.deepEqual(result,{choices,error:null});
});

test('an incomplete or altered link cannot replace the current plan',()=>{
 for(const value of [choices.slice(0,4),choices.map((c,i)=>i===0?{...c,cost:0}:c),null]){
  const result=planner.readLinkedPlan?.('?plan='+encodeURIComponent(JSON.stringify(value)));
  assert.equal(result?.choices,null);
  assert.ok(result?.error);
 }
});

test('missing link is normal while broken JSON is explained',()=>{
 assert.deepEqual(planner.readLinkedPlan?.(''),{choices:null,error:null});
 assert.ok(planner.readLinkedPlan?.('?plan=broken')?.error);
});
