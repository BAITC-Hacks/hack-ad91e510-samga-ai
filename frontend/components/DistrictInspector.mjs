import { activeSnapshot, districtIssues, recommendationsFor, relevantChoices } from '../lib/district-insights.mjs';
import { esc, fmt, groupIcons, groupLabels } from '../lib/format.mjs';
import { selectionReason } from '../lib/scenario.mjs';
import { Icon } from './Icon.mjs';
export function DistrictInspector(state) {
  const district=activeSnapshot(state).districts.find(d=>d.name===state.district);
  const issues=districtIssues(district,state.data.indicators,state.mapLayer);
  const selected=issues.find(i=>i.id===state.mapIssue) ?? issues[0];
  const attention=issues.filter(i=>i.value<60);
  const visible=state.showAllIssues ? issues : issues.slice(0,3);
  const measures=recommendationsFor(selected.id,state.data.measures).slice(0,2);
  return `<aside class="district-inspector instrument-panel" id="district-inspector" aria-label="Проблемы выбранного района"><div class="inspector-heading"><div><span class="instrument-eyebrow">ВЫБРАННЫЙ РАЙОН</span><h2>${esc(district.name)}${Icon('chevron')}</h2></div><div class="inspector-score"><strong>${fmt(district.score,1)}</strong><span>из 100</span></div></div><p class="inspector-pop">${Icon('people')} ${fmt(district.pop*100,0)}% населения модели <span>·</span> ${attention.length} зон внимания</p><div class="inspector-tabs"><span class="active">Проблемы района</span><a href="#districts" data-action="inspect-district">Все показатели ${Icon('arrow')}</a></div><div class="problem-list">${visible.map(issue=>{
    const planned=relevantChoices(state,district.name,issue.id).length;
    const before=state.data.baseline.districts.find(d=>d.name===district.name).values[issue.id];
    const improved=state.mapStage==='after' && issue.value>before;
    return `<button class="problem-item ${selected.id===issue.id ? 'selected' : ''}" data-action="map-issue" data-issue="${issue.id}" aria-pressed="${selected.id===issue.id}" data-focus="issue-${issue.id}"><span class="problem-status ${issue.severity}">${Icon(groupIcons[issue.id[0]])}</span><span class="problem-copy"><strong>${esc(issue.name)}</strong><small>${improved ? `Улучшено · было ${fmt(before,1)}` : planned ? 'Мера добавлена в план' : issue.severity==='critical' ? 'Критический показатель' : issue.severity==='attention' ? 'Требует внимания' : 'Устойчивый показатель'}</small></span><b>${fmt(issue.value,0)}</b>${Icon('chevron')}</button>`;
  }).join('')}</div>${issues.length>3 ? `<button class="show-all-issues" data-action="toggle-issues">${state.showAllIssues ? 'Свернуть показатели' : `Все показатели${state.mapLayer==='all' ? ' · 10' : ''}`} ${Icon('chevron')}</button>` : ''}<div class="solution-section"><div class="solution-heading"><span>${Icon('spark')} ПОДХОДЯЩИЕ МЕРЫ</span><small>${groupLabels[selected.id[0]]}</small></div><p class="solution-context">Улучшить: <strong>${esc(selected.name.toLowerCase())}</strong></p><div class="map-solutions">${measures.map(measure=>{
    const choice=state.choices.find(c=>c.id===measure.id);
    const applies=choice && (measure.type==='city' || choice.district===district.name);
    const reason=selectionReason(state.choices,measure,state.data.measures,district.name);
    return `<article class="map-solution ${applies ? 'planned' : ''}"><div class="map-solution-title"><h3>${esc(measure.name)}</h3><span>${measure.cost}<small> ед.</small></span></div><p><b>+${measure.effects[selected.id]}</b> ${esc(selected.name.toLowerCase())}</p><div class="map-solution-bottom"><span>${Icon(measure.type==='city'?'city':'pin')}${measure.type==='city'?'Весь город':esc(district.name)}</span><button data-action="${applies?'remove':'map-pick'}" data-id="${measure.id}" ${state.busy || (!applies && reason) ? 'disabled' : ''} aria-label="${applies?'Убрать из плана':'Добавить в план'}: ${esc(measure.name)}">${Icon(applies?'check':'plus')}${applies?'В плане':'В план'}</button></div>${!applies && reason ? `<p class="map-solution-reason">${choice?.district ? `Уже выбрано: ${esc(choice.district)}` : esc(reason)}</p>` : ''}</article>`;
  }).join('')}</div><p class="solution-note">Полный эффект до учёта задержки. Последствия появятся после расчёта 5 решений.</p><a class="all-measures" href="#decisions">Открыть каталог мероприятий ${Icon('arrow')}</a></div></aside>`;
}
