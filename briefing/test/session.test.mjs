import test from 'node:test';
import assert from 'node:assert/strict';
import {createBriefingSession} from '../session.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('late search cannot replace a newer plan selected by the user',async()=>{
 const search=deferred();
 const session=createBriefingSession({request:async(path,body)=>path==='/api/search'?search.promise:{brief:{choices:body.choices},html:'current'}});
 const pending=session.search({objective:'score'});
 await session.select([{id:'new'}]);
 search.resolve({status:'optimal',scenario:{choices:[{id:'old'}]}});
 await pending;
 assert.deepEqual(session.state.choices,[{id:'new'}]);
 assert.deepEqual(session.state.brief.choices,[{id:'new'}]);
});
test('a late report cannot overwrite the result for a newer comparison',async()=>{
 const first=deferred();let calls=0;
 const session=createBriefingSession({request:async()=>++calls===1?first.promise:{brief:{current:true},html:'new'}});
 const pending=session.select([{id:'one'}]);
 await session.compare([{id:'two'}]);
 first.resolve({brief:{current:false},html:'old'});await pending;
 assert.equal(session.state.html,'new');
});
test('infeasible search preserves the previous valid plan and explicitly reports no new result',async()=>{
 const session=createBriefingSession({request:async path=>path==='/api/search'?{status:'infeasible',search:'exhaustive',scenario:null,validCount:0,eligibleCount:0,constraints:{maxBudget:1}}:{brief:{valid:true},html:'saved'}});
 await session.select([{id:'existing'}]);
 await session.search({maxBudget:1});
 assert.deepEqual(session.state.choices,[{id:'existing'}]);
 assert.equal(session.state.search.status,'infeasible');
 assert.equal(session.state.html,'saved');
 assert.ok(session.state.error.length>0);
});
test('a partial or unknown search cannot be presented as the best plan',async()=>{
 const session=createBriefingSession({request:async path=>path==='/api/search'?{status:'optimal',search:'approximate',scenario:{choices:[{id:'candidate'}]},constraints:{objective:'score'}}:{brief:{valid:true},html:'saved'}});
 await session.select([{id:'existing'}]);await session.search({objective:'score'});
 assert.deepEqual(session.state.choices,[{id:'existing'}]);
 assert.equal(session.state.search,null);
 assert.ok(session.state.error.length>0);
});
