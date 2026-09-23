import { Icon } from '../components/Icon.mjs';
import { GlassCard } from '../components/GlassCard.mjs';
import { ScoreRing } from '../components/ScoreRing.mjs';
import { MetricBar } from '../components/MetricBar.mjs';
import { CityIllustration } from '../components/CityIllustration.mjs';
import { groupValues, groupLabels, groupIcons } from '../lib/format.mjs';
export function Home(state) {
  const spent = state.choices.reduce((sum, c) => sum + state.data.measures.find(m => m.id === c.id).cost, 0);
  const groups = groupValues(state.data.baseline);
  return `<header class="page-heading"><div class="eyebrow">АСТАНА · ГОРОД В ВАШИХ РУКАХ</div><h1>Аким на 5 часов<span class="title-dot">.</span></h1><p>Управляйте городом. Увидьте последствия.</p></header>
  <div class="home-grid"><section class="budget-hero"><div class="hero-top"><span class="label-light">Ваш городской бюджет</span><span class="hero-badge">${Icon('clock')} 5 решений</span></div><div class="hero-amount">100<span>условных<br>единиц</span></div><div class="hero-stats"><div><span>Осталось</span><strong>${100-spent}<small> / 100</small></strong></div><div><span>Решения</span><strong>${state.choices.length}<small> / 5</small></strong></div></div>${CityIllustration()}<div class="hero-caption"><span class="status-dot"></span> Будущее начинается с решения</div></section>
  ${GlassCard(`<div class="section-heading"><h2>Качество жизни</h2><span class="small-tag">Сейчас</span></div>${ScoreRing(state.data.baseline.score)}<p class="score-caption">Astana Quality of Life</p><p class="score-footnote">Точка отсчёта вашего сценария</p>`, 'home-score')}</div>
  <section class="city-status"><div class="section-heading"><h2>Состояние города</h2><span class="muted">5 направлений</span></div><div class="city-metrics">${Object.entries(groups).map(([key,value]) => `<div class="city-metric" data-group="${key}"><span class="category-icon">${Icon(groupIcons[key])}</span>${MetricBar({ label:groupLabels[key], before:value, group:key })}</div>`).join('')}</div><p class="fine-print">Средние показатели направлений с учётом доли населения · шкала 0–100</p></section>
  <div class="home-bottom"><div class="intro-note"><span class="note-icon">${Icon('spark')}</span><div><strong>Пять решений. Один город.</strong><p>Выберите приоритеты — и узнайте, как изменится жизнь районов.</p></div></div><a href="#decisions" class="button primary">${state.choices.length ? 'Продолжить управление' : 'Начать управление'}${Icon('arrow')}</a></div>
  <div class="home-facts"><span>${Icon('map')} 5 районов</span><span>${Icon('decisions')} 14 мероприятий</span><span>${Icon('chart')} Измеримые последствия</span></div>`;
}
