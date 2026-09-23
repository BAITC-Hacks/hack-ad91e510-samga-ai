import {Worker} from 'node:worker_threads';
import {normalizeConstraints} from './optimizer.mjs';
const cache=new Map();let active=0;
export function searchPlans(constraints={}){
 const clean=normalizeConstraints(constraints),key=JSON.stringify(clean);
 if(cache.has(key))return Promise.resolve(structuredClone(cache.get(key)));
 if(active>=2)return Promise.reject(new Error('SEARCH_BUSY'));
 active++;
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./search-worker.mjs',import.meta.url),{workerData:clean});
  let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);active--;worker.terminate();
   if(error)reject(error);else{if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,result);resolve(structuredClone(result));}};
  const timer=setTimeout(()=>finish(new Error('SEARCH_TIMEOUT')),30000);
  worker.once('message',message=>message.error?finish(new Error(message.error)):finish(null,message.result));
  worker.once('error',error=>finish(error));worker.once('exit',code=>{if(!settled)finish(new Error('SEARCH_FAILED: '+code));});
 });
}
