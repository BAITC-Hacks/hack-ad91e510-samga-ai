import { analyse, baseline, districts, indicators, measures, presets } from '../demos/astana-story/comparison.mjs';
import { inspectDraft } from '../demos/astana-story/planner.mjs';

export class InputError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

const round = value => Math.round(value * 100) / 100;
const names = new Set(districts.map(d => d.name));
const ids = new Set(measures.map(m => m.id));

function compact(report) {
  return {
    cost: report.result.cost,
    remaining: report.remaining,
    score: round(report.result.score),
    delta: round(report.delta),
    critical: report.result.critical,
    districts: report.districts.map(d => ({
      name: d.name,
      before: round(d.before.score),
      after: round(d.after.score),
      critical: d.indicators.filter(i => i.critical).map(i => i.name),
      indicators: d.indicators.map(i => ({ id: i.id, name: i.name, before: round(i.before), after: round(i.after), critical: i.critical })),
    })),
  };
}

export function buildContext(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['choices', 'selectedDistrict'].includes(k))) {
    throw new InputError('Недопустимые поля запроса.');
  }
  if (!Array.isArray(input.choices) || input.choices.some(c => !c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(k => !['id', 'district'].includes(k)) || !ids.has(c.id))) {
    throw new InputError('Проверьте список решений и мероприятия.');
  }
  if (input.selectedDistrict != null && !names.has(input.selectedDistrict)) throw new InputError('Неизвестный район.');
  const draft = inspectDraft(input.choices);
  if (draft.errors.length) throw new InputError(`Проверьте решения: ${draft.errors.join(' ')}`);
  const report = draft.complete ? analyse(input.choices) : null;
  if (report && !report.ok) throw new InputError(`Проверьте решения: ${report.errors.join(' ')}`);
  const current = report ? compact(report) : {
    cost: draft.cost, remaining: draft.remaining, score: null, delta: null, critical: null,
    districts: baseline.districts.map(d => ({ name: d.name, before: round(d.score), after: null,
      critical: d.critical.map(id => indicators.find(i => i.id === id).name),
      indicators: indicators.map(i => ({ id: i.id, name: i.name, before: round(d.values[i.id]), after: null, critical: d.values[i.id] < 40 })) })),
  };
  const facts = { ...current, draft: !draft.complete, selectedDistrict: input.selectedDistrict ?? null, choices: input.choices.map(c => ({ id: c.id, ...(c.district ? { district: c.district } : {}) })), baselineScore: round(baseline.score) };
  const comparison = presets.map(p => ({ id: p.id, title: p.title, choices: p.choices, ...compact(analyse(p.choices)) }));
  return { facts, comparison, indicatorNames: indicators.map(i => i.name) };
}

export function trustedPrompt(context) {
  return JSON.stringify({ current: context.facts, presets: context.comparison.map(p => ({
    id: p.id, title: p.title, cost: p.cost, remaining: p.remaining, score: p.score,
    delta: p.delta, critical: p.critical,
    districts: p.districts.map(d => ({ name: d.name, before: d.before, after: d.after, critical: d.critical })),
  })) });
}
