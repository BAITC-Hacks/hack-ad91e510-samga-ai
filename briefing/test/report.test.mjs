import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../../docs/brief-analysis/dist/data.mjs';
import {buildBrief,renderBriefHtml} from '../report.mjs';

const plan=id=>scenarios.find(s=>s.id===id).choices;
const close=(actual,want)=>assert.ok(Math.abs(actual-want)<1e-8,`${actual} ≠ ${want}`);

test('decision brief recalculates the chosen plan and exposes the real equal-cost tradeoff',()=>{
 const b=buildBrief({choices:plan('source'),comparisonChoices:plan('capital')});
 close(b.scenario.result.score,56.54307);
 assert.equal(b.scenario.result.cost,95);
 assert.equal(b.comparison.delta.cost,0);
 close(b.comparison.delta.score,2.6865225);
 assert.equal(b.comparison.delta.critical,-2);
 assert.ok(b.comparison.delta.average<0,'average is lower despite a better overall score');
 assert.ok(b.tradeoffs.some(x=>x.district==='Есиль'&&x.indicator==='S1'&&x.delta<0));
 assert.equal(b.critical.resolved.length,2);
 assert.equal(b.critical.remaining.length,0);
 close(b.decomposition.reduce((n,x)=>n+x.contribution,0),2.6865225);
});

test('a critical-free result never means every city problem is solved',()=>{
 const b=buildBrief({choices:plan('source')});
 assert.equal(b.coverage.included.length,4);
 assert.deepEqual(b.coverage.missing,['Транспорт']);
 assert.ok(b.unchanged.some(x=>x.district==='Нура'&&x.indicator==='T2'&&x.after===40));
 assert.equal(b.model.quarters,8);
 assert.equal(b.ai.status,'not-included');
});

test('brief preserves negative effects and remaining critical indicators',()=>{
 const b=buildBrief({choices:plan('cheap')});
 assert.ok(b.tradeoffs.some(x=>x.district==='Нура'&&x.indicator==='T1'&&x.delta===-1.75));
 assert.ok(b.critical.remaining.some(x=>x.district==='Нура'&&x.indicator==='S2'&&x.after===37.625));
});

test('invalid or tampered choices cannot produce an executive brief',()=>{
 assert.throws(()=>buildBrief({choices:plan('source').slice(0,4)}),/INVALID_SCENARIO/);
 assert.throws(()=>buildBrief({choices:plan('source').map(c=>({...c,cost:0}))}),/INVALID_SCENARIO/);
 assert.throws(()=>buildBrief({choices:plan('source'),comparisonChoices:[]}),/INVALID_SCENARIO/);
});

test('export is autonomous, escapes supplied titles and exposes reproducible source data',()=>{
 const b=buildBrief({choices:plan('source'),title:'<img src=x onerror=alert(1)>'});
 const html=renderBriefHtml(b);
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!/<script|<img|<iframe|<link/i.test(html));
 assert.ok(html.includes(b.scenario.scenarioId));
 assert.ok(html.includes('Нура'));
 assert.ok(html.includes('56,54'));
 assert.ok(html.includes('M7'));
 assert.ok(html.includes('@media print'));
});
