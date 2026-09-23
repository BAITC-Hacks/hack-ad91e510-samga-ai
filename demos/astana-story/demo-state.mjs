import { measures, scenarios } from '../../docs/brief-analysis/dist/data.mjs';
import { evaluate, simulate } from '../../docs/brief-analysis/dist/model.mjs';

const coverage = scenarios.find((scenario) => scenario.id === 'coverage');
const catalog = new Map(measures.map((measure) => [measure.id, measure]));

export const baseline = simulate([]);
export const result = evaluate(coverage.choices);
if (result.errors.length) throw new Error(`Невалидный сценарий демо: ${result.errors.join('; ')}`);
export const projects = coverage.choices.map((choice) => ({
  ...catalog.get(choice.id),
  district: choice.district,
}));
export const LAST_STEP = 15;

function phaseFor(step) {
  if (step === 0) return 'intro';
  if (step <= 5) return 'planning';
  if (step === 6) return 'ready';
  if (step < LAST_STEP) return 'simulation';
  return 'result';
}

export function getFrame(step) {
  if (!Number.isInteger(step) || step < 0 || step > LAST_STEP) {
    throw new RangeError(`Шаг демо должен быть целым числом от 0 до ${LAST_STEP}.`);
  }

  const phase = phaseFor(step);
  const selectedCount = step === 0 ? 0 : step <= 5 ? step : projects.length;
  const selected = projects.slice(0, selectedCount);
  const cost = selected.reduce((total, project) => total + project.cost, 0);
  const quarter = phase === 'simulation' ? step - 6 : phase === 'result' ? 8 : 0;
  const projectStates = projects.map((project, index) => {
    if (phase === 'result') return 'active';
    if (phase === 'simulation') return quarter <= project.lag ? 'building' : 'active';
    return index < selectedCount ? 'planned' : 'pending';
  });

  return {
    step,
    phase,
    selectedCount,
    cost,
    remaining: 100 - cost,
    quarter,
    showResult: step === LAST_STEP,
    projectStates,
  };
}
