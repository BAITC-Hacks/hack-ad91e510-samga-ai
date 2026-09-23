export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = (value, digits = 2) => Number(value).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const signed = value => `${value >= 0 ? '+' : '−'}${fmt(Math.abs(value))}`;
export const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
export const groupLabels = { T: 'Транспорт', E: 'Экология', S: 'Соцсфера', B: 'Безопасность', C: 'Сервисы' };
export const groupIcons = { T: 'transport', E: 'leaf', S: 'heart', B: 'shield', C: 'grid' };
// These are descriptive averages of the supplied indicators, never the Quality of Life Score.
export function groupValues(snapshot) {
  return Object.fromEntries(Object.keys(groupLabels).map(group => [group,
    snapshot.districts.reduce((sum, d) => sum + d.pop * (d.values[`${group}1`] + d.values[`${group}2`]) / 2, 0)
  ]));
}
