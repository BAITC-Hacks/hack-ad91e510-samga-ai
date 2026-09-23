import { districts, indicators, measures, scenarios } from '../../docs/brief-analysis/dist/data.mjs';
import { evaluate, simulate } from '../../docs/brief-analysis/dist/model.mjs';

const scenario = (id) => scenarios.find((candidate) => candidate.id === id);
const catalog = new Map(measures.map((measure) => [measure.id, measure]));

export { districts, indicators, measures };
export const baseline = simulate([]);
export const presets = [
  { id: 'capital', title: 'Всё в Есиль', choices: scenario('capital').choices.map((choice) => ({ ...choice })) },
  { id: 'source', title: 'Помочь слабым районам', choices: scenario('source').choices.map((choice) => ({ ...choice })) },
  { id: 'cheap', title: 'Сохранить резерв', choices: scenario('cheap').choices.map((choice) => ({ ...choice })) },
];

export function analyse(choices) {
  const result = evaluate(choices);
  if (result.errors.length) return { ok: false, errors: result.errors };

  return {
    ok: true,
    errors: [],
    result,
    remaining: 100 - result.cost,
    delta: result.score - baseline.score,
    districts: result.districts.map((afterDistrict) => {
      const beforeDistrict = baseline.districts.find((district) => district.name === afterDistrict.name);
      return {
        name: afterDistrict.name,
        before: beforeDistrict,
        after: afterDistrict,
        delta: afterDistrict.score - beforeDistrict.score,
        localProjects: choices.filter((choice) => choice.district === afterDistrict.name),
        indicators: indicators.map((indicator) => ({
          id: indicator.id,
          name: indicator.name,
          before: beforeDistrict.values[indicator.id],
          after: afterDistrict.values[indicator.id],
          delta: afterDistrict.values[indicator.id] - beforeDistrict.values[indicator.id],
          critical: afterDistrict.values[indicator.id] < 40,
        })),
      };
    }),
  };
}

export function moveProject(choices, id, districtName) {
  const project = catalog.get(id);
  if (!project || !choices.some((choice) => choice.id === id)) {
    throw new RangeError(`Мероприятие ${id} отсутствует в плане.`);
  }
  if (project.type === 'city') {
    throw new RangeError(`${id} — городская мера, район для неё не указывается.`);
  }
  if (!districts.some((district) => district.name === districtName)) {
    throw new RangeError(`Район «${districtName}» отсутствует в модели.`);
  }
  return choices.map((choice) => ({ ...choice, ...(choice.id === id ? { district: districtName } : {}) }));
}
