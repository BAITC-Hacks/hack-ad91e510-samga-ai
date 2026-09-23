import assert from 'node:assert/strict';
import test from 'node:test';

import { measures, scenarios } from '../../docs/brief-analysis/dist/data.mjs';
import { evaluate } from '../../docs/brief-analysis/dist/model.mjs';
import { LAST_STEP, baseline, getFrame, projects, result } from './demo-state.mjs';

test('показывает фиксированный сценарий coverage без ошибок и с финальным расчётом engine', () => {
  assert.deepEqual(result, evaluate(scenarios.find((scenario) => scenario.id === 'coverage').choices));
  assert.deepEqual(result.errors, []);
  assert.equal(result.cost, 85);
  assert.equal(result.score, 55.708059999999996);
  assert.equal(Number(baseline.score.toFixed(5)), 52.55768);
  assert.equal(LAST_STEP, 15);
});

test('переносит пять проектов из сценария в компактный контракт демо', () => {
  assert.deepEqual(
    projects.map(({ id, district, cost, lag, effects, group, name }) => ({ id, district, cost, lag, effects, group, name })),
    [
      { id: 'M1', district: 'Нура', cost: 18, lag: 2, effects: { T1: 6, T2: 9 }, group: 'T', name: 'Выделенные полосы для автобусов' },
      { id: 'M4', district: 'Сарыарка', cost: 15, lag: 2, effects: { E1: 12, E2: 3, B1: 2 }, group: 'E', name: 'Парк / сквер' },
      { id: 'M7', district: 'Нура', cost: 24, lag: 3, effects: { S1: 16 }, group: 'S', name: 'Школа + детсад' },
      { id: 'M10', district: 'Нура', cost: 12, lag: 1, effects: { B1: 12, B2: 2 }, group: 'B', name: 'Освещение и камеры' },
      { id: 'M14', district: undefined, cost: 16, lag: 1, effects: { C1: 5, C2: 2 }, group: 'C', name: 'Аварийные бригады ЖКХ и раннее оповещение' },
    ],
  );
  assert.deepEqual(projects.map((project) => measures.find((measure) => measure.id === project.id)?.id), ['M1', 'M4', 'M7', 'M10', 'M14']);
});

test('наращивает бюджет по одному проекту во время планирования', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 15].map((step) => getFrame(step).cost),
    [0, 18, 33, 57, 69, 85, 85, 85],
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 15].map((step) => getFrame(step).remaining),
    [100, 82, 67, 43, 31, 15, 15, 15],
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((step) => getFrame(step).selectedCount),
    [0, 1, 2, 3, 4, 5, 5],
  );
});

test('отмечает границы фаз и кварталов', () => {
  assert.deepEqual(
    [0, 1, 5, 6, 7, 14, 15].map((step) => {
      const frame = getFrame(step);
      return { step, phase: frame.phase, quarter: frame.quarter, showResult: frame.showResult };
    }),
    [
      { step: 0, phase: 'intro', quarter: 0, showResult: false },
      { step: 1, phase: 'planning', quarter: 0, showResult: false },
      { step: 5, phase: 'planning', quarter: 0, showResult: false },
      { step: 6, phase: 'ready', quarter: 0, showResult: false },
      { step: 7, phase: 'simulation', quarter: 1, showResult: false },
      { step: 14, phase: 'simulation', quarter: 8, showResult: false },
      { step: 15, phase: 'result', quarter: 8, showResult: true },
    ],
  );
});

test('переключает состояния проектов по лагу и в финале активирует все', () => {
  assert.deepEqual(getFrame(2).projectStates, ['planned', 'planned', 'pending', 'pending', 'pending']);
  assert.deepEqual(getFrame(7).projectStates, ['building', 'building', 'building', 'building', 'building']);
  assert.deepEqual(getFrame(9).projectStates, ['active', 'active', 'building', 'active', 'active']);
  assert.deepEqual(getFrame(15).projectStates, ['active', 'active', 'active', 'active', 'active']);
});

test('отклоняет шаги за пределами целочисленной шкалы', () => {
  for (const step of [-1, 16, 1.5, Number.NaN, '7', null]) {
    assert.throws(() => getFrame(step), RangeError);
  }
});
