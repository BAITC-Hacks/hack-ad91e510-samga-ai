import test from 'node:test';
import assert from 'node:assert/strict';
import { geography } from '../lib/astana-geography.mjs';
import { severity, districtIssues, recommendationsFor, relevantChoices, activeSnapshot } from '../lib/district-insights.mjs';
import { indicators,measures } from '../../docs/brief-analysis/dist/data.mjs';
import { baseline } from '../services/demo-api.mjs';
import { zoomCamera } from '../lib/map-interaction.mjs';
test('bundled map has five real OSM districts, attribution and valid paths',()=>{
  assert.deepEqual(geography.districts.map(d=>d.name).sort(),baseline.districts.map(d=>d.name).sort());
  assert.equal(geography.license,'ODbL-1.0');
  for(const d of geography.districts){assert.ok(d.osmId>0);assert.match(d.path,/^M.*Z$/);assert.equal(d.anchor.length,2);assert.ok(d.anchor.every(Number.isFinite));}
  assert.ok(geography.roads.length>100);
  assert.ok(geography.water.length>0);
});
test('district problems reflect model thresholds and selected direction',()=>{
  const nura=baseline.districts.find(d=>d.name==='Нура');
  assert.equal(districtIssues(nura,indicators)[0].id,'S2');
  assert.equal(districtIssues(nura,indicators).filter(i=>i.severity==='critical').length,2);
  assert.deepEqual(districtIssues(nura,indicators,'T').map(i=>i.id),['T2','T1']);
  assert.equal(severity(40),'attention');assert.equal(severity(60),'stable');assert.equal(severity(39.99),'critical');
});
test('suggestions address the selected metric and plan badges respect district scope',()=>{
  assert.equal(recommendationsFor('S2',measures)[0].id,'M8');
  assert.ok(recommendationsFor('E2',measures).every(m=>m.effects.E2>0));
  const state={data:{measures},choices:[{id:'M8',district:'Нура'},{id:'M12'}]};
  assert.equal(relevantChoices(state,'Нура','S2').length,1);
  assert.equal(relevantChoices(state,'Есиль','S2').length,0);
  assert.equal(relevantChoices(state,'Есиль','C2').length,1);
});
test('map never switches to invented post-decision data and zoom stays bounded',()=>{
  assert.equal(activeSnapshot({mapStage:'after',result:null,data:{baseline}}),baseline);
  assert.equal(activeSnapshot({mapStage:'before',result:{score:99},data:{baseline}}),baseline);
  assert.equal(zoomCamera([75,100,960,730],.001)[2],350);
  assert.equal(zoomCamera([75,100,960,730],100)[2],1450);
});
