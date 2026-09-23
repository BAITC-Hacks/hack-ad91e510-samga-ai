import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {createApp} from '../backend/server.mjs';

const reference=[{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
const capital=reference.map(c=>c.district?{...c,district:'Есиль'}:c);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from reference ${b}`);

export async function runJuryCheck(base,{liveAi=false,includeSearch=true}={}){
 const checks=[];
 const call=async(path,body)=>{
  const response=await fetch(new URL(path,base),body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
  return {status:response.status,body:await response.json()};
 };
 async function check(id,requirement,action){
  try{const evidence=await action();checks.push({id,requirement,status:'passed',evidence});}
  catch(error){checks.push({id,requirement,status:'failed',error:error.message});}
 }
 let scenario;
 await check('equal-start','Единые исходные данные и бюджет',async()=>{
  const a=await call('/api/simulate',{choices:reference}),b=await call('/api/simulate',{choices:capital});
  assert.equal(a.status,200);assert.equal(b.status,200);assert.deepEqual(a.body.baseline,b.body.baseline);
  approx(a.body.baseline.score,52.55768);assert.equal(a.body.baseline.critical,2);
  scenario=a.body;return {baseline:scenario.baseline.score,critical:2};
 });
 await check('official-example','Эталон DOCX воспроизводится',async()=>{
  assert.ok(scenario);approx(scenario.result.score,56.54307);assert.equal(scenario.result.cost,95);assert.equal(scenario.result.critical,0);
  return {score:scenario.result.score,cost:95,critical:0};
 });
 await check('decision-impact','Изменение решений меняет итог',async()=>{
  const b=await call('/api/simulate',{choices:capital});assert.equal(b.status,200);approx(b.body.result.score,53.8565475);
  assert.ok(b.body.result.score<scenario.result.score);assert.equal(b.body.result.critical,2);
  return {sameCost:95,reference:scenario.result.score,alternative:b.body.result.score};
 });
 const invalid=[
  ['budget', [{id:'M3',district:'Нура'},{id:'M5',district:'Сарыарка'},{id:'M7',district:'Нура'},{id:'M10',district:'Нура'},{id:'M14'}]],
  ['four-decisions',reference.slice(0,4)],
  ['duplicate',[reference[0],reference[0],...reference.slice(2)]],
  ['missing-district',reference.map((c,i)=>i===0?{id:c.id}:c)],
  ['city-with-district',reference.map(c=>c.id==='M12'?{...c,district:'Нура'}:c)],
  ['incompatible',[{id:'M1',district:'Нура'},{id:'M3',district:'Есиль'},{id:'M4',district:'Сарыарка'},{id:'M10',district:'Нура'},{id:'M12'}]],
  ['injected-price',reference.map((c,i)=>i===0?{...c,cost:0}:c)]
 ];
 for(const [id,choices] of invalid)await check(id,'Недопустимый план не получает Score',async()=>{
  const r=await call('/api/simulate',{choices});assert.equal(r.status,422);assert.equal(r.body.result,undefined);assert.ok(r.body.error.code);
  return {http:r.status,reason:r.body.error.code};
 });
 await check('order','Порядок выбора не меняет результат и идентификатор',async()=>{
  const r=await call('/api/simulate',{choices:[...reference].reverse()});assert.equal(r.status,200);
  assert.deepEqual(r.body,scenario);return {scenarioId:r.body.scenarioId};
 });
 await check('tamper','Изменённые числа отклоняются до AI-запроса',async()=>{
  const changed=structuredClone(scenario);changed.result.score=100;
  const r=await call('/api/analyze',changed);assert.equal(r.status,422);assert.equal(r.body.error.code,'SCENARIO_MISMATCH');
  return {http:r.status,reason:r.body.error.code};
 });
 await check('horizon','Неподтверждённые прогнозы не выдаются за расчёт',async()=>{
  const r=await call('/api/facts',{choices:reference,years:10});assert.equal(r.status,422);assert.equal(r.body.error.code,'HORIZON_UNSUPPORTED');
  return {requestedYears:10,reason:r.body.error.code};
 });
 if(includeSearch)await check('exhaustive-search','Оптимальность подтверждена полным поиском в модели',async()=>{
  const r=await call('/api/search',{objective:'score'});assert.equal(r.status,200);assert.equal(r.body.status,'optimal');assert.equal(r.body.search,'exhaustive');
  assert.equal(r.body.validCount,694395);approx(r.body.scenario.result.score,57.236735);assert.equal(r.body.scenario.result.cost,98);
  return {validCount:r.body.validCount,score:r.body.scenario.result.score,cost:98,scope:r.body.scope};
 });
 let ai={status:'not-run',reason:'Живой AI не вызван. Шаблоны и mock-тесты не подтверждают этот критерий.'};
 if(liveAi){
  try{
   const health=await call('/api/health');assert.equal(health.body.aiMode,'openai','Сервер не работает в режиме живого AI');assert.equal(health.body.aiConfigured,true,'Доступ AI не настроен');
   const r=await call('/api/analyze',scenario);assert.equal(r.status,200);assert.equal(r.body.mode,'openai');assert.equal(r.body.scenarioId,scenario.scenarioId);
   approx(r.body.score,56.54307);assert.ok(r.body.analysis.summary.length>0);
   assert.ok(r.body.analysis.strengths.length>0);assert.ok(r.body.analysis.risks.length>0);
   ai={status:'passed',scenarioId:r.body.scenarioId,analysis:r.body.analysis,note:'Один живой сценарий. Качество остальных ответов и свободного диалога требует отдельной проверки.'};
  }catch(error){ai={status:'failed',error:error.message};}
 }
 return {schemaVersion:1,checkedAt:new Date().toISOString(),scope:'HTTP/API; не заменяет браузерный проход, проверку на другом ноутбуке и подтверждение сдачи.',checks,liveAi:ai,
  deterministicPassed:checks.every(c=>c.status==='passed'),requiredAiVerified:ai.status==='passed'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),usage='Usage: node scripts/jury-check.mjs [--url http://127.0.0.1:4197] [--live-ai]';
 let target=null,liveAi=false;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--live-ai'){if(liveAi)throw new Error(usage);liveAi=true;}
  else if(args[i]==='--url'){
   if(target||!args[i+1]||args[i+1].startsWith('--'))throw new Error(usage);
   target=args[++i];
   try{if(!['http:','https:'].includes(new URL(target).protocol))throw new Error();}catch{throw new Error(usage);}
  }else throw new Error(usage);
 }
 let app;
 try{
  let base=target;
  if(liveAi&&!base)throw new Error('--live-ai requires --url of the configured running server');
  if(!base){app=createApp({mode:'demo'});app.listen(0,'127.0.0.1');await once(app,'listening');base='http://127.0.0.1:'+app.address().port;}
  const result=await runJuryCheck(base,{liveAi});console.log(JSON.stringify(result,null,2));
  if(!result.deterministicPassed||(liveAi&&!result.requiredAiVerified))process.exitCode=1;
 }finally{if(app)await new Promise(resolve=>{app.close(resolve);app.closeAllConnections();});}
}
