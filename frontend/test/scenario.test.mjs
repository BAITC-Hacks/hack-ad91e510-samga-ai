import test from 'node:test';
import assert from 'node:assert/strict';
import { measures, districts } from '../../docs/brief-analysis/dist/data.mjs';
import { selectionReason, restoreChoices, spentBudget } from '../lib/scenario.mjs';
import { demoResponse } from '../services/demo-api.mjs';
const m = id => measures.find(x => x.id === id);
const data = { measures, districts };
test('budget, five decisions, duplicate and group constraints', () => {
  const choices = [{id:'M3',district:'Нура'},{id:'M13',district:'Алматы'},{id:'M7',district:'Есиль'}];
  assert.equal(spentBudget(choices, measures),82);
  assert.match(selectionReason(choices,m('M2'),measures),/бюджета/);
  assert.match(selectionReason(choices,m('M3'),measures),/Уже/);
  assert.match(selectionReason([{id:'M7'},{id:'M8'}],m('M9'),measures),/Не более 2/);
  assert.match(selectionReason(Array.from({length:5},(_,i)=>({id:`X${i}`})),m('M1'),measures),/5 из 5/);
});
test('city and district conflicts match the backend rules', () => {
  assert.match(selectionReason([{id:'M1',district:'Нура'}],m('M3'),measures),/несовместимы/);
  assert.match(selectionReason([{id:'M4',district:'Есиль'}],m('M7'),measures,'Есиль'),/несовместимы/);
  assert.equal(selectionReason([{id:'M4',district:'Есиль'}],m('M7'),measures,'Нура'),'');
  assert.match(selectionReason([{id:'M5',district:'Есиль'}],m('M13'),measures,'Есиль'),/несовместимы/);
});
test('draft recovery rejects unknown measures, invalid districts and duplicates', () => {
  assert.deepEqual(restoreChoices('broken',data),[]);
  assert.deepEqual(restoreChoices(JSON.stringify([{id:'M1',district:'unknown'},{id:'M2',district:'Есиль'},{id:'M2'},{id:'unknown'},null]),data),[{id:'M2'}]);
});
test('server demo uses the existing model and rejects partial results', () => {
  assert.equal(demoResponse('/api/me').data.baseline.score,52.55768);
  assert.equal(demoResponse('/api/evaluate',{choices:[]}).status,422);
  const choices = [{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
  const response = demoResponse('/api/evaluate',{choices});
  assert.equal(response.status,200);
  assert.ok(Math.abs(response.data.score-56.54307)<1e-9);
  assert.equal(demoResponse('/api/analyze',{choices}).data.mode,'model');
});
