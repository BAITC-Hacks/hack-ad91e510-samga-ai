import test from 'node:test';import assert from 'node:assert/strict';
import {calculateScenario} from '../scenarios.mjs';
import {validateGrounding,renderGroundedAnalysis,defaultSelection} from '../grounding.mjs';
import {evidenceFor} from '../evidence.mjs';
import {scenarios} from '../../docs/brief-analysis/dist/data.mjs';
const s=calculateScenario(scenarios[0].choices);
test('assistant renders factual text exclusively from server facts',()=>{
 const sel=defaultSelection(s),r=renderGroundedAnalysis(sel,s);
 assert.deepEqual(validateGrounding(sel,s),[]);assert.match(r.analysis.summary,/95/);
 assert.equal(r.grounding.scenarioId,s.scenarioId);
});
test('fabricated facts, polarity, duplicate citations, free prose and actions are rejected',()=>{
 for(const sel of [
 {strengthIds:['made.up'],riskIds:[],nextAction:'compare'},
 {strengthIds:['result.cost'],riskIds:[],nextAction:'compare'},
 {strengthIds:[],riskIds:['result.score'],nextAction:'compare'},
 {strengthIds:['result.score','result.score'],riskIds:[],nextAction:'compare'},
 {...defaultSelection(s),summary:'Life expectancy rises 20 years'},
 {...defaultSelection(s),nextAction:'apply'}])assert.ok(validateGrounding(sel,s).length);
});
test('evidence gaps are explicit and external material never changes coefficients',()=>{
 const r=evidenceFor(['M7','M9','M10']);
 assert.ok(r.cards.some(c=>c.id==='wb-school'));assert.deepEqual(r.gaps,['M9','M10']);
 assert.ok(r.cards.every(c=>c.usedAsCoefficient===false && c.limit && c.reviewedAt));
});

test('known downside stays visible even when AI omits it',()=>{
 const plan=calculateScenario([{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M11',district:'Нура'},{id:'M12'}]);
 const report=renderGroundedAnalysis({strengthIds:[],riskIds:[],nextAction:'compare'},plan);
 assert.ok(report.analysis.risks.some(r=>r.text.includes('Разгрузка дорог')));
});
