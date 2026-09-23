import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {createApp} from '../server.mjs';
import {resolveStaticAsset} from '../static.mjs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';

async function start(t) {
 const app=createApp({mode:'demo'});app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
 const root='http://127.0.0.1:'+app.address().port;
 return async path=>{
  const response=await fetch(root+path,{redirect:'manual'});
  return {status:response.status,headers:response.headers,body:await response.text()};
 };
}

test('city demo and its browser imports are served with browser-safe MIME types',async t=>{
 const get=await start(t);
 for(const [path,type] of [
  ['/demos/astana-city/','text/html'],['/demos/astana-city/app.mjs','text/javascript'],
  ['/demos/astana-city/style.css','text/css'],['/demos/astana-city/vendor/maplibre-gl.js','text/javascript'],
  ['/demos/astana-city/vendor/maplibre-gl.css','text/css'],['/demos/astana-city/astana.geojson','application/geo+json'],
  ['/demos/astana-city/base-style.json','application/json'],['/docs/brief-analysis/dist/data.mjs','text/javascript'],
  ['/docs/brief-analysis/dist/model.mjs','text/javascript'],['/frontend/lib/scenario.mjs','text/javascript'],
  ['/frontend/lib/format.mjs','text/javascript'],['/analytics/','text/html'],['/analytics/workbench.js','text/javascript'],
  ['/workbench.js','text/javascript'],['/workbench.css','text/css']
 ]) {
  const response=await get(path);assert.equal(response.status,200,path);assert.ok((response.headers.get('content-type')??'').startsWith(type),path);
 }
});

test('new Akim panel is the root entry and serves only its named browser assets',async t=>{
 const get=await start(t);
 const root=await get('/');assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/demos/astana-story/');
 for(const [path,type] of [
  ['/demos/astana-story/','text/html'],['/demos/astana-story/main.html','text/html'],
  ['/demos/astana-story/app.mjs','text/javascript'],['/demos/astana-story/assistant/assistant.mjs','text/javascript'],
  ['/demos/astana-story/assets/akim-civic-hall.png','image/png']
 ]) {
  const response=await get(path);assert.equal(response.status,200,path);assert.ok((response.headers.get('content-type')??'').startsWith(type),path);
 }
 for(const path of ['/demos/astana-story/task_plan.md','/demos/astana-story/assistant/avatar/ORIGIN.md','/demos/astana-story/assistant/unknown.mjs']) assert.equal((await get(path)).status,404,path);
});

test('catalog includes the exact baseline without client profile fields',async t=>{
 const get=await start(t);const response=await get('/api/catalog');
 const catalog=JSON.parse(response.body);
 assert.ok(Math.abs(catalog.baseline.score-52.55768)<1e-10);
 assert.ok(catalog.baseline.districts.every(district=>!Object.hasOwn(district,'profile')));
});

test('entry redirect preserves a plan selected in the briefing',async t=>{
 const get=await start(t),response=await get('/?plan=%5B%5D');
 assert.equal(response.status,302);
 assert.equal(response.headers.get('location'),'/demos/astana-story/?plan=%5B%5D');
});

test('health reports configuration state without exposing configuration values',async t=>{
 const app=createApp({mode:'openai',apiKey:'not-a-real-secret',model:'test-model'});app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
 const response=await fetch('http://127.0.0.1:'+app.address().port+'/api/health');const body=await response.text();
 assert.equal(response.status,200);assert.equal(body.includes('not-a-real-secret'),false);assert.equal(body.includes('test-model'),false);
});

test('static server denies private files and traversal attempts',async t=>{
 const get=await start(t);
 for(const path of ['/backend/server.mjs','/.env','/backend/.env.example','/demos/astana-city/%2e%2e%2f%2e%2e%2fbackend%2fserver.mjs','/docs/brief-analysis/dist/sources/nope.pdf']) {
  assert.equal((await get(path)).status,404,path);
 }
 for(const path of ['/docs/brief-analysis/dist/sources/brief.pdf','/docs/brief-analysis/dist/sources/dataset.docx']) assert.equal((await get(path)).status,200,path);
});

test('city resolver only permits named public assets',()=>{
 for(const path of ['/demos/astana-city/test/session.test.mjs','/demos/astana-city/.env.json','/demos/astana-city/credentials.json']) {
  assert.equal(resolveStaticAsset(path),null,path);
 }
 assert.equal(resolveStaticAsset('/demos/astana-city/planner.mjs')?.type,'text/javascript');
 assert.equal(resolveStaticAsset('/demos/astana-story/assistant/avatar/ORIGIN.md'),null);
 assert.equal(resolveStaticAsset('/mobile/preview/card.png')?.type,'image/png');
 assert.equal(resolveStaticAsset('/mobile/preview/../index.html'),null);
});

test('CLI serves the API from another cwd on an explicit loopback port',async t=>{
 const port=await new Promise((resolve,reject)=>{
  const probe=net.createServer();probe.once('error',reject).listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});
 });
 const cwd=await mkdtemp(join(tmpdir(),'samga cli-'));
 const child=spawn(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{cwd,env:{...process.env,PORT:String(port),AI_MODE:'demo'}});
 t.after(async()=>{if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}await rm(cwd,{recursive:true,force:true});});
 await once(child.stdout,'data');
 const response=await fetch(`http://127.0.0.1:${port}/api/catalog`);
 assert.equal(response.status,200);assert.ok(Math.abs((await response.json()).baseline.score-52.55768)<1e-10);
});
