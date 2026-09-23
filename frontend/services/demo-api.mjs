// Server-only development adapter. Scores always come from the team's existing model.
import { evaluate, simulate } from '../../docs/brief-analysis/dist/model.mjs';
import { measures, indicators } from '../../docs/brief-analysis/dist/data.mjs';
export const baseline = simulate([]);
export function demoResponse(path, body = {}) {
  if (path === '/api/me') return { status: 200, data: { user: null, aiAvailable: false, demo: true, baseline } };
  if (!['/api/evaluate', '/api/analyze'].includes(path)) return { status: 404, data: { error: 'Метод не найден.' } };
  const result = evaluate(body?.choices);
  if (result.errors.length) return { status: 422, data: { error: result.errors.join(' ') } };
  if (path === '/api/evaluate') return { status: 200, data: result };
  const fmt = value => value.toFixed(2).replace('.',',');
  const changes = result.districts.map(d => ({ name:d.name, gain:d.score-baseline.districts.find(b => b.name === d.name).score }));
  const strongest = [...changes].sort((a,b) => b.gain-a.gain)[0];
  const weakest = [...result.districts].sort((a,b) => a.score-b.score)[0];
  const weakestIndicator = [...indicators].sort((a,b) => weakest.values[a.id]-weakest.values[b.id])[0];
  const labels = {T:'Транспорт',E:'Экология',S:'Соцсфера',B:'Безопасность',C:'Сервисы'};
  const missing = Object.keys(labels).filter(group => !body.choices.some(c => measures.find(m => m.id === c.id).group === group));
  return { status: 200, data: { mode:'model', result, explanation:null,
    notice:'AI пока не подключён. Ниже — факты из серверного расчёта по модели команды.',
    summary:[
      {text:`Наибольшее изменение: ${strongest.name}, +${fmt(strongest.gain)} к показателю района.`},
      {text:result.critical ? `Показателей ниже порога 40: ${result.critical}. Самая низкая оценка района — ${weakest.name}: ${fmt(weakest.score)}.` : `Критических показателей ниже 40 нет. Самая низкая оценка района — ${weakest.name}: ${fmt(weakest.score)}.`},
      {text:missing.length ? `Без отдельных мероприятий: ${missing.map(g=>labels[g]).join(', ')}. Возможны косвенные эффекты других решений.` : `Решения охватывают все пять направлений. В резерве остаётся ${100-result.cost} единиц.`}
    ],
    recommendations:[{title:`Проверьте приоритеты района ${weakest.name}`,description:`Самый низкий показатель: ${weakestIndicator.name} — ${fmt(weakest.values[weakestIndicator.id])} из 100`}]
  } };
}
