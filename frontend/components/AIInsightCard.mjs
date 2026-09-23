import { Icon } from './Icon.mjs';
import { GlassCard } from './GlassCard.mjs';
import { esc } from '../lib/format.mjs';
function explanationMarkup(text) {
  return String(text).split(/\n+/).filter(line => line.trim()).map(line => {
    const safe = esc(line.trim().replace(/^#{1,6}\s+/,''));
    return `<p>${safe.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}</p>`;
  }).join('');
}
export function AIInsightCard(state) {
  const analysis = state.analysis;
  if (state.analysisBusy) return GlassCard(`<div class="section-heading"><h2>${Icon('spark')} AI-анализ</h2><span class="spinner"></span></div><p class="ai-intro">Разбираем сильные стороны, риски и компромиссы ваших решений.</p><div class="skeleton" aria-hidden="true"><i></i><i></i><i></i></div><span class="sr-only" role="status">Ожидаем анализ сценария</span>`,'ai-card');
  if (state.analysisError) return GlassCard(`<div class="section-heading"><h2>${Icon('spark')} AI-анализ</h2><span class="small-tag">Попробуйте ещё раз</span></div><p class="ai-intro">${esc(state.analysisError)}</p><p class="fine-print">Рассчитанные показатели сохранены на экране.</p><button class="button secondary" data-action="retry-analysis">Повторить анализ ${Icon('reset')}</button>`,'ai-card');
  const isAI = analysis?.mode === 'ai' && Boolean(analysis.explanation);
  const summary = analysis?.summary ?? [];
  const recommendation = analysis?.recommendations?.[0];
  const facts = [
    ['Сильные стороны',summary[0]?.text,'chart'],
    ['Риски',summary[1]?.text,'shield'],
    ['Компромиссы',summary[2]?.text,'decisions'],
    ['Что улучшить',recommendation ? `${recommendation.title}. ${recommendation.description}.` : null,'spark']
  ].filter(([,text]) => text);
  return GlassCard(`<div class="section-heading"><h2>${Icon('spark')}${isAI ? 'AI-анализ' : 'Разбор сценария'}</h2><span class="small-tag">${isAI ? 'SAMGA AI' : 'По расчётной модели'}</span></div>${isAI ? `<div class="ai-explanation">${explanationMarkup(analysis.explanation)}</div>` : `<p class="ai-intro">${esc(analysis?.notice ?? 'AI-анализ пока недоступен.')}</p>`}${facts.length ? `<div class="ai-facts">${facts.map(([title,text,icon]) => `<section><span class="ai-fact-icon">${Icon(icon)}</span><div><h3>${title}</h3><p>${esc(text)}</p></div></section>`).join('')}</div>` : isAI ? '' : `<div class="ai-awaiting"><span>${Icon('spark')}</span><p>Персональный AI-разбор появится после подключения AI-сервиса.</p><div>Сильные стороны <b>·</b> Риски <b>·</b> Компромиссы <b>·</b> Что улучшить</div></div>`}`,'ai-card ai-enter');
}
