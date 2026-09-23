import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluate } from '../../docs/brief-analysis/dist/model.mjs';
import {
  analyse,
  baseline,
  districts,
  indicators,
  measures,
  moveProject,
  presets,
} from './comparison.mjs';

const preset = (id) => presets.find((candidate) => candidate.id === id);

test('переносит три фиксированных набора с независимыми копиями решений', () => {
  assert.deepEqual(presets.map(({ id, title }) => ({ id, title })), [
    { id: 'capital', title: 'Всё в Есиль' },
    { id: 'source', title: 'Помочь слабым районам' },
    { id: 'cheap', title: 'Сохранить резерв' },
  ]);
  assert.notEqual(preset('source').choices, preset('capital').choices);
  assert.equal(districts.length, 5);
  assert.equal(measures.length, 14);
  assert.equal(indicators.length, 10);
});

test('показывает разницу одинакового набора мер в Есиле и слабых районах', () => {
  const capital = analyse(preset('capital').choices);
  const source = analyse(preset('source').choices);

  assert.equal(capital.result.cost, 95);
  assert.equal(source.result.cost, 95);
  assert.equal(capital.result.synergies[0].pair, source.result.synergies[0].pair);
  assert.notEqual(capital.result.synergies[0].district, source.result.synergies[0].district);
  assert.notEqual(capital.result.score, source.result.score);
  assert.notEqual(capital.result.critical, source.result.critical);
  assert.equal(capital.result.critical, 2);
  assert.equal(source.result.critical, 0);
});

test('сравнивает готовые планы без утверждения оптимальности', () => {
  const results = presets.map((candidate) => ({ id: candidate.id, analysis: analyse(candidate.choices) }));
  const recommended = results.find((candidate) => candidate.id === 'source').analysis;

  assert.ok(recommended.result.score > results.find((candidate) => candidate.id === 'capital').analysis.result.score);
  assert.ok(recommended.result.score > results.find((candidate) => candidate.id === 'cheap').analysis.result.score);
  assert.equal(analyse(preset('cheap').choices).result.cost, 61);
  assert.equal(analyse(preset('cheap').choices).result.critical, 1);
  assert.equal(analyse(preset('cheap').choices).districts.find((district) => district.name === 'Нура').indicators.find((indicator) => indicator.id === 'T1').delta, -1.75);
});

test('строит данные по районам из реального engine и оставляет резерв бюджета', () => {
  const analysis = analyse(preset('source').choices);
  const nura = analysis.districts.find((district) => district.name === 'Нура');

  assert.equal(analysis.ok, true);
  assert.deepEqual(analysis.errors, []);
  assert.deepEqual(analysis.result, evaluate(preset('source').choices));
  assert.equal(analysis.remaining, 5);
  assert.equal(analysis.delta, analysis.result.score - baseline.score);
  assert.deepEqual(nura.localProjects.map((choice) => choice.id), ['M7', 'M8', 'M10']);
  assert.deepEqual(
    nura.indicators.find((indicator) => indicator.id === 'S1'),
    { id: 'S1', name: 'Школы и детсады', before: 38, after: 48, delta: 10, critical: false },
  );
});

test('перенос школы из Есиля в Нуру устраняет один критический показатель без смены стоимости', () => {
  const capital = preset('capital').choices;
  const moved = moveProject(capital, 'M7', 'Нура');
  const before = analyse(capital);
  const after = analyse(moved);

  assert.equal(before.result.cost, 95);
  assert.equal(after.result.cost, 95);
  assert.equal(before.result.critical, 2);
  assert.equal(after.result.critical, 1);
  assert.equal(capital.find((choice) => choice.id === 'M7').district, 'Есиль');
  assert.equal(moved.find((choice) => choice.id === 'M7').district, 'Нура');
  assert.notEqual(capital, moved);
  assert.notEqual(capital[0], moved[0]);
});

test('возвращает ошибки невалидного сценария без результативных полей', () => {
  const invalid = analyse([{ id: 'M1', district: 'Нура' }]);

  assert.deepEqual(invalid, { ok: false, errors: ['Нужно ровно 5 решений.'] });
  assert.equal('result' in invalid, false);
  assert.equal('score' in invalid, false);
});

test('не меняет входные наборы и отклоняет недопустимый перенос', () => {
  const original = preset('source').choices;
  const snapshot = structuredClone(original);

  assert.throws(() => moveProject(original, 'M12', 'Нура'), RangeError);
  assert.throws(() => moveProject(original, 'M404', 'Нура'), RangeError);
  assert.throws(() => moveProject(original, 'M7', 'Несуществующий район'), RangeError);
  assert.deepEqual(original, snapshot);
});
