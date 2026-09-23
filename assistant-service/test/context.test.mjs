import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../context.mjs';
import { presets } from '../../demos/astana-story/comparison.mjs';

test('context recalculates the plan and includes all three canonical presets', () => {
  const context = buildContext({ choices: presets[1].choices, selectedDistrict: 'Нура' });
  assert.equal(context.facts.cost, 95);
  assert.equal(context.facts.selectedDistrict, 'Нура');
  assert.equal(context.comparison.length, 3);
  assert.deepEqual(context.comparison.map(x => x.id), ['capital', 'source', 'cheap']);
  assert.ok(context.facts.districts.some(x => x.name === 'Нура' && x.indicators.some(i => i.critical)) === false);
});

test('context rejects forged numeric fields and invalid choices', () => {
  assert.throws(() => buildContext({ choices: presets[1].choices, score: 999 }), /поле|поля/i);
  assert.throws(() => buildContext({ choices: [{ id: 'M999' }] }), /решени|мероприят/i);
});

test('incomplete plan exposes draft and baseline but no final score', () => {
  const context = buildContext({ choices: [] });
  assert.equal(context.facts.draft, true);
  assert.equal(context.facts.cost, 0);
  assert.equal(context.facts.score, null);
  assert.equal(typeof context.facts.baselineScore, 'number');
});

test('null selected district means no district selected', () => {
  const context = buildContext({ choices: [], selectedDistrict: null });
  assert.equal(context.facts.selectedDistrict, null);
});
