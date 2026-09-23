import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../server.mjs';
const choices=[{id:'M7',district:'Нура'},{id:'M8',district:'Нура'},{id:'M10',district:'Нура'},{id:'M12'},{id:'M5',district:'Сарыарка'}];
test('briefing page exports a server-recomputed report and refuses forged input',async t=>{
 const app=createApp({mode:'demo'});app.listen(0,'127.0.0.1');await once(app,'listening');
 t.after(()=>new Promise(r=>app.close(r)));const base='http://127.0.0.1:'+app.address().port;
 for(const path of ['/briefing/','/briefing/app.mjs','/briefing/session.mjs','/briefing/style.css']){
  assert.equal((await fetch(base+path)).status,200,path);
 }
 for(const path of ['/briefing/report.mjs','/briefing/test/report.test.mjs'])assert.equal((await fetch(base+path)).status,404);
 const post=body=>fetch(base+'/api/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await post({choices,title:'<script>bad()</script>'});assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.brief.scenario.result.cost,95);
 assert.ok(Math.abs(result.brief.scenario.result.score-56.54307)<1e-8);
 assert.ok(result.html.includes('&lt;script&gt;'));assert.ok(!result.html.includes('<script>'));
 assert.equal((await post({choices,result:{score:100}})).status,422);
 assert.equal((await post({choices:choices.slice(0,4)})).status,422);
});
