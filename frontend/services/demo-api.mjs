// Server-only development adapter. Scores always come from the team's existing model.
import { evaluate, simulate } from '../../docs/brief-analysis/dist/model.mjs';
export const baseline = simulate([]);
export function demoResponse(path, body = {}) {
  if (path === '/api/me') return { status: 200, data: { user: null, aiAvailable: false, demo: true, baseline } };
  if (!['/api/evaluate', '/api/analyze'].includes(path)) return { status: 404, data: { error: 'Метод не найден.' } };
  const result = evaluate(body.choices);
  if (result.errors.length) return { status: 422, data: { error: result.errors.join(' ') } };
  if (path === '/api/evaluate') return { status: 200, data: result };
  return { status: 200, data: { mode: 'model', result, explanation: null, notice: 'AI пока не подключён. Показатели рассчитаны сервером по модели команды.', summary: [], recommendations: [] } };
}
