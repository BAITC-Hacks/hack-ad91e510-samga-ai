import test from 'node:test';
import assert from 'node:assert/strict';
import { measures,districts,indicators,scenarios } from '../../docs/brief-analysis/dist/data.mjs';
import { baseline,demoResponse } from '../services/demo-api.mjs';
import { canFinishPlan,guidedReason,journeyProblems,outcomeFacts } from '../lib/journey.mjs';
const data={measures,districts,indicators,baseline};
test('guided planning reserves enough budget to finish all five decisions',()=>{
  assert.equal(canFinishPlan([],data),true);
  const state={data,choices:[{id:'M13',district:'Алматы'},{id:'M7',district:'Нура'}]};
  assert.match(guidedReason(state,measures.find(m=>m.id==='M3'),'Нура'),/пять решений/);
  assert.equal(guidedReason(state,measures.find(m=>m.id==='M10'),'Нура'),'');
  assert.equal(canFinishPlan([...state.choices,{id:'M3',district:'Нура'},{id:'M12'}],data),false);
});
test('the official scenario stays available throughout the guided journey',()=>{
  const choices=[];
  for(const choice of scenarios.find(s=>s.id==='source').choices){
    assert.equal(guidedReason({data,choices},measures.find(m=>m.id===choice.id),choice.district),'');
    choices.push(choice);
  }
  assert.equal(canFinishPlan(choices,data),true);
});
test('first priorities describe actual baseline problems and never claim planned effects happened',()=>{
  const state={data,choices:[]};
  const problems=journeyProblems(state);
  assert.equal(problems[0].district,'Нура');assert.equal(problems[0].id,'S2');assert.equal(problems[0].value,35);
  state.choices=[{id:'M8',district:'Нура'}];
  const planned=journeyProblems(state).find(p=>p.district==='Нура'&&p.id==='S2');
  assert.equal(planned.value,35);assert.equal(planned.planned,1);
});
test('human-readable outcomes use only the returned model values',()=>{
  const choices=scenarios.find(s=>s.id==='source').choices;
  const result=demoResponse('/api/evaluate',{choices}).data;
  const facts=outcomeFacts({data,choices,result});
  assert.equal(facts.best.name,'Нура');assert.equal(facts.improved,5);
  assert.equal(facts.weakest.value,40);assert.equal(facts.weakest.district,'Алматы');
  assert.equal(facts.weakest.name,'Разгрузка дорог');
});
