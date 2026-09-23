import { esc, fmt, clamp, signed } from '../lib/format.mjs';
export function MetricBar({ label, before, after = before, group = '', compare = false }) {
  return `<div class="metric" data-group="${esc(group)}"><div class="metric-label"><span>${esc(label)}</span><span class="metric-numbers">${compare ? `<span class="muted">${fmt(before,1)}</span><span class="metric-arrow">→</span>` : ''}<strong>${fmt(after,1)}</strong>${compare && after !== before ? `<small class="${after > before ? 'positive' : 'negative'}">${signed(after-before)}</small>` : ''}</span></div><div class="metric-track"><span class="metric-fill" style="--value:${clamp(after)}%"></span>${compare ? `<i class="metric-before" style="left:${clamp(before)}%"></i>` : ''}</div></div>`;
}
