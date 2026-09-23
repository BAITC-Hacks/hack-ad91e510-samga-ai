export const ATTENTION_THRESHOLD = 60;
export const CRITICAL_THRESHOLD = 40;
export function severity(value) { return value < CRITICAL_THRESHOLD ? 'critical' : value < ATTENTION_THRESHOLD ? 'attention' : 'stable'; }
export function activeSnapshot(state) { return state.mapStage === 'after' && state.result ? state.result : state.data.baseline; }
export function districtIssues(district, indicators, layer = 'all') {
  return indicators.filter(i => layer === 'all' || i.id.startsWith(layer)).map(i => ({...i,value:district.values[i.id],severity:severity(district.values[i.id])})).sort((a,b)=>a.value-b.value);
}
export function recommendationsFor(indicatorId, measures) {
  // Catalog matching, not an optimizer: only positive effects on the selected indicator.
  return measures.filter(m => m.effects[indicatorId] > 0).sort((a,b)=>a.cost-b.cost);
}
export function relevantChoices(state, district, indicatorId) {
  return state.choices.filter(c => {
    const m = state.data.measures.find(item=>item.id===c.id);
    return m && (m.type==='city' || c.district===district) && m.effects[indicatorId]>0;
  });
}
