export const STORAGE_KEY = 'samga.frontend.scenario.v1';
export const spentBudget = (choices, measures) => choices.reduce((sum, c) => sum + (measures.find(m => m.id === c.id)?.cost ?? 0), 0);
export function selectionReason(choices, measure, measures, district) {
  if (!measure) return 'Мероприятие не найдено.';
  if (choices.some(c => c.id === measure.id)) return 'Уже добавлено';
  if (choices.length >= 5) return 'Выбрано 5 из 5';
  if (spentBudget(choices, measures) + measure.cost > 100) return 'Недостаточно бюджета';
  if (choices.filter(c => measures.find(m => m.id === c.id)?.group === measure.group).length >= 2) return 'Не более 2 в направлении';
  if (['M1','M3'].includes(measure.id) && choices.some(c => ['M1','M3'].includes(c.id))) return 'ЛРТ и автобусные полосы несовместимы';
  if (district) {
    for (const pair of [['M4','M7'],['M5','M13']]) {
      if (pair.includes(measure.id) && choices.some(c => pair.includes(c.id) && c.district === district)) return pair[0] === 'M4' ? 'Парк и школа несовместимы в одном районе' : 'Топливо и модернизация сетей несовместимы в одном районе';
    }
  }
  return '';
}
export function restoreChoices(raw, data) {
  const restored = [];
  try {
    const input = JSON.parse(raw);
    if (!Array.isArray(input)) return [];
    for (const choice of input.slice(0,5)) {
      const measure = data.measures.find(m => m.id === choice?.id);
      if (!measure || selectionReason(restored, measure, data.measures, choice.district)) continue;
      if (measure.type === 'district' && !data.districts.some(d => d.name === choice.district)) continue;
      restored.push(measure.type === 'city' ? { id:measure.id } : { id:measure.id, district:choice.district });
    }
  } catch { /* An outdated or damaged draft must not prevent startup. */ }
  return restored;
}
