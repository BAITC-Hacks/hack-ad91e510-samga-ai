import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,evaluate} from '../../docs/brief-analysis/dist/model.mjs';
import {baseline,presets,analyse} from './comparison.mjs';
import {inspectDraft,proposeChoice,buildDistrictMatrix,realizedEffects} from './planner.mjs';

test('черновик допускает меньше пяти, но строгая оценка по-прежнему не возвращает Score',()=>{
 const choices=[{id:'M7',district:'Нура'}];
 assert.deepEqual(validate(choices,{allowIncomplete:true}),[]);
 assert.equal(evaluate(choices).score,undefined);
 assert.deepEqual(inspectDraft(choices),{errors:[],cost:24,remaining:76,directions:{S:1},complete:false,canCalculate:false});
});
test('черновик сохраняет ограничение на пять решений и все несовместимости',()=>{
 const source=presets.find(p=>p.id==='source').choices;
 assert.ok(inspectDraft([...source,{id:'M14'}]).errors.length);
 assert.match(inspectDraft([{id:'M1',district:'Нура'},{id:'M3',district:'Есиль'}]).errors.join(' '),/M1 и M3/);
 assert.match(inspectDraft([{id:'M4',district:'Нура'},{id:'M7',district:'Нура'}]).errors.join(' '),/M4 и M7/);
 assert.match(inspectDraft([{id:'M5',district:'Нура'},{id:'M13',district:'Нура'}]).errors.join(' '),/M5 и M13/);
});
test('каталог блокирует повтор, третью меру направления, превышение бюджета и отсутствие района',()=>{
 assert.equal(proposeChoice([{id:'M7',district:'Нура'}],'M7','Есиль').allowed,false);
 assert.equal(proposeChoice([{id:'M7',district:'Нура'},{id:'M8',district:'Нура'}],'M9','Алматы').allowed,false);
 assert.equal(proposeChoice([{id:'M3',district:'Нура'},{id:'M5',district:'Сарыарка'},{id:'M7',district:'Нура'}],'M13','Алматы').allowed,false);
 assert.equal(proposeChoice([],'M7',undefined).allowed,false);
});
test('городская мера не получает район, замена не увеличивает число решений и не мутирует вход',()=>{
 const original=presets.find(p=>p.id==='source').choices;
 const snapshot=structuredClone(original);
 const city=proposeChoice([],'M12','Нура');
 assert.deepEqual(city.choice,{id:'M12'});
 assert.equal(city.allowed,true);
 const replacement=proposeChoice(original,'M9','Нура',0);
 assert.equal(replacement.allowed,true);
 assert.equal(replacement.choices.length,5);
 assert.equal(replacement.cost,81);
 assert.deepEqual(original,snapshot);
 assert.equal(inspectDraft(replacement.choices).canCalculate,true);
 assert.throws(()=>proposeChoice(original,'M9','Нура',8),RangeError);
});
test('сравнение содержит десять показателей всех выбранных районов и точные изменения',()=>{
 const result=analyse(presets.find(p=>p.id==='source').choices).result;
 const matrix=buildDistrictMatrix(['Нура','Есиль','Сарыарка'],result);
 assert.equal(matrix.rows.length,10);
 assert.deepEqual(matrix.districts.map(d=>d.name),['Нура','Есиль','Сарыарка']);
 assert.equal(matrix.districts[0].populationShare,.16);
 const schools=matrix.rows.find(r=>r.id==='S1');
 assert.deepEqual(schools.values[0],{district:'Нура',before:38,after:48,delta:10,critical:false});
 assert.equal(matrix.rows.find(r=>r.id==='E2').values[2].after,48.75);
 assert.equal(buildDistrictMatrix(['Нура'],baseline).rows.find(r=>r.id==='S2').values[0].critical,true);
 assert.throws(()=>buildDistrictMatrix(['Нура','Нура'],result),RangeError);
 assert.throws(()=>buildDistrictMatrix(['Неизвестный'],result),RangeError);
});
test('сравнение и карточки мер сохраняют отрицательные эффекты и лаг',()=>{
 const cheap=analyse(presets.find(p=>p.id==='cheap').choices).result;
 const roads=buildDistrictMatrix(['Нура'],cheap).rows.find(r=>r.id==='T1').values[0];
 assert.equal(roads.delta,-1.75);
 assert.equal(realizedEffects('M11').find(e=>e.id==='T1').delta,-1.75);
 assert.equal(realizedEffects('M7').find(e=>e.id==='S1').delta,10);
});
