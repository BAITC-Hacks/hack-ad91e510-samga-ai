import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate, evaluate} from '../dist/model.mjs';

const example = [{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-9, `${actual} != ${expected}`);
test('база учитывает население, слабейший район и два критических значения',()=>{
 const r=simulate([]); near(r.score,52.55768); near(r.average,56.8624); assert.equal(r.critical,2); near(r.minimum,49.18);
});
test('пример DOCX воспроизводит лаги и фиксированную синергию',()=>{
 const r=evaluate(example); assert.deepEqual(r.errors,[]); assert.equal(r.cost,95); near(r.score,56.54307); assert.equal(r.critical,0); near(r.districts[4].score,52.9625); near(r.districts[4].values.B1,67.5);
});
test('порядок выбора не меняет район синергии и итог',()=>{
 const a=evaluate(example),b=evaluate([...example].reverse()); near(a.score,b.score); assert.deepEqual(a.districts,b.districts);
});
test('лаг уменьшает прямой эффект, отрицательный эффект сохраняется',()=>{
 const r=simulate([{id:'M11',district:'Нура'}]); near(r.districts[4].values.T1,53.25); near(r.districts[4].values.B2,60.5);
});
test('значение ровно 40 не критическое',()=>{assert.equal(simulate([]).critical,2)});
test('наборы короче пяти не получают итоговый Score',()=>{const r=evaluate(example.slice(0,4)); assert.ok(r.errors.some(x=>x.includes('ровно 5'))); assert.equal(r.score,undefined)});
test('превышение бюджета блокирует расчёт',()=>{const r=evaluate([{id:'M3',district:'Есиль'},{id:'M5',district:'Сарыарка'},{id:'M7',district:'Нура'},{id:'M10',district:'Нура'},{id:'M14'}]);assert.ok(r.errors.some(x=>x.includes('100')));assert.equal(r.score,undefined)});
test('повтор мероприятия в другом районе всё равно запрещён',()=>{const r=evaluate([...example.slice(0,4),{id:'M7',district:'Есиль'}]);assert.ok(r.errors.some(x=>x.includes('повтор')))});
test('район обязателен для районной меры и запрещён городской',()=>{assert.ok(evaluate(example.map(x=>x.id==='M7'?{id:'M7'}:x)).errors.some(x=>x.includes('район')));assert.ok(evaluate(example.map(x=>x.id==='M12'?{...x,district:'Нура'}:x)).errors.some(x=>x.includes('городской')))});
test('M1 и M3 конфликтуют даже в разных районах',()=>{const r=evaluate([{id:'M1',district:'Есиль'},{id:'M3',district:'Нура'},...example.slice(2)]);assert.ok(r.errors.some(x=>x.includes('M1 и M3')))});
test('земельный конфликт M4/M7 возникает только в одном районе',()=>{
 const s=[{id:'M1',district:'Нура'},{id:'M4',district:'Сарыарка'},{id:'M7',district:'Нура'},{id:'M10',district:'Нура'},{id:'M14'}];
 assert.deepEqual(evaluate(s).errors,[]);assert.ok(evaluate(s.map(x=>x.id==='M4'?{...x,district:'Нура'}:x)).errors.some(x=>x.includes('M4 и M7')));
});
test('три меры одного направления запрещены',()=>{const r=evaluate([{id:'M4',district:'Есиль'},{id:'M5',district:'Сарыарка'},{id:'M6'},{id:'M10',district:'Нура'},{id:'M12'}]);assert.ok(r.errors.some(x=>x.includes('двух')))});
